import Foundation
import HealthKit
import os

@MainActor
@Observable
final class HealthKitService {
    private let store = HKHealthStore()
    private let log = Logger(subsystem: "com.krishsaraf.log", category: "health")

    private static let requestedKey = "log.health.requested"

    var access: HealthAccess = .unknown
    var snapshot = HealthSnapshot.empty
    var isLoading = false
    var loadFailed = false

    private static var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = []
        let quantities: [HKQuantityTypeIdentifier] = [
            .stepCount,
            .activeEnergyBurned,
            .appleExerciseTime,
            .appleStandTime,
            .heartRate,
            .restingHeartRate,
            .bodyMass,
        ]
        for id in quantities {
            if let type = HKQuantityType.quantityType(forIdentifier: id) {
                types.insert(type)
            }
        }
        if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            types.insert(sleep)
        }
        types.insert(HKObjectType.workoutType())
        return types
    }

    func prepare() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            access = .unavailable
            return
        }

        access = currentAccess()
        if access == .authorized {
            await refresh()
        }
    }

    func requestAccess() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            access = .unavailable
            return
        }

        do {
            try await store.requestAuthorization(toShare: [], read: Self.readTypes)
            UserDefaults.standard.set(true, forKey: Self.requestedKey)
            access = .authorized
            await refresh()
        } catch {
            log.error("Authorization failed: \(error.localizedDescription, privacy: .public)")
            access = .denied
        }
    }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }

        let steps = await sum(.stepCount, unit: .count())
        let calories = await sum(.activeEnergyBurned, unit: .kilocalorie())
        let exercise = await sum(.appleExerciseTime, unit: .minute())
        let standMinutes = await sum(.appleStandTime, unit: .minute())
        let resting = await latest(.restingHeartRate, unit: HKUnit.count().unitDivided(by: .minute()))
        let avgHR = await average(.heartRate, unit: HKUnit.count().unitDivided(by: .minute()))
        let weight = await latest(.bodyMass, unit: .gramUnit(with: .kilo), dayOnly: false)
        let sleep = await sleepMinutesLastNight()
        let workouts = await recentWorkouts()

        let standHours = standMinutes.map { $0 / 60 }

        let hasAnything =
            steps != nil || calories != nil || exercise != nil || standHours != nil
            || resting != nil || avgHR != nil || weight != nil || sleep != nil
            || !workouts.isEmpty

        snapshot = HealthSnapshot(
            steps: steps,
            activeCalories: calories,
            exerciseMinutes: exercise,
            standHours: standHours,
            restingHeartRate: resting,
            averageHeartRate: avgHR,
            sleepMinutes: sleep,
            weightKg: weight,
            lastUpdated: Date(),
            workouts: workouts
        )
        loadFailed = !hasAnything
    }

    private func currentAccess() -> HealthAccess {
        if UserDefaults.standard.bool(forKey: Self.requestedKey) {
            return .authorized
        }
        return .needed
    }

    private func todayInterval() -> DateInterval {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: Date())
        return DateInterval(start: start, end: Date())
    }

    private func sum(_ id: HKQuantityTypeIdentifier, unit: HKUnit) async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return nil }
        let interval = todayInterval()
        let predicate = HKQuery.predicateForSamples(
            withStart: interval.start,
            end: interval.end,
            options: .strictStartDate
        )

        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { [log] _, stats, error in
                if let error {
                    log.error("sum \(id.rawValue, privacy: .public): \(error.localizedDescription, privacy: .public)")
                    continuation.resume(returning: nil)
                    return
                }
                continuation.resume(returning: stats?.sumQuantity()?.doubleValue(for: unit))
            }
            store.execute(query)
        }
    }

    private func average(_ id: HKQuantityTypeIdentifier, unit: HKUnit) async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return nil }
        let interval = todayInterval()
        let predicate = HKQuery.predicateForSamples(
            withStart: interval.start,
            end: interval.end,
            options: .strictStartDate
        )

        return await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: .discreteAverage
            ) { [log] _, stats, error in
                if let error {
                    log.error("avg \(id.rawValue, privacy: .public): \(error.localizedDescription, privacy: .public)")
                    continuation.resume(returning: nil)
                    return
                }
                continuation.resume(returning: stats?.averageQuantity()?.doubleValue(for: unit))
            }
            store.execute(query)
        }
    }

    private func latest(
        _ id: HKQuantityTypeIdentifier,
        unit: HKUnit,
        dayOnly: Bool = true
    ) async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return nil }
        let start = dayOnly
            ? todayInterval().start
            : Calendar.current.date(byAdding: .day, value: -90, to: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictEndDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: 1,
                sortDescriptors: [sort]
            ) { [log] _, samples, error in
                if let error {
                    log.error("latest \(id.rawValue, privacy: .public): \(error.localizedDescription, privacy: .public)")
                    continuation.resume(returning: nil)
                    return
                }
                let value = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: unit)
                continuation.resume(returning: value)
            }
            store.execute(query)
        }
    }

    private func sleepMinutesLastNight() async -> Double? {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return nil }
        let calendar = Calendar.current
        let todayStart = calendar.startOfDay(for: Date())
        guard
            let windowStart = calendar.date(byAdding: .hour, value: -18, to: todayStart),
            let windowEnd = calendar.date(byAdding: .hour, value: 14, to: todayStart)
        else { return nil }

        let predicate = HKQuery.predicateForSamples(
            withStart: windowStart,
            end: windowEnd,
            options: .strictStartDate
        )
        let asleep: Set<Int> = [
            HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
            HKCategoryValueSleepAnalysis.asleepCore.rawValue,
            HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
            HKCategoryValueSleepAnalysis.asleepREM.rawValue,
            HKCategoryValueSleepAnalysis.asleep.rawValue,
        ]

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: nil
            ) { [log] _, samples, error in
                if let error {
                    log.error("sleep: \(error.localizedDescription, privacy: .public)")
                    continuation.resume(returning: nil)
                    return
                }

                let minutes = (samples as? [HKCategorySample] ?? [])
                    .filter { asleep.contains($0.value) }
                    .reduce(0.0) { $0 + $1.endDate.timeIntervalSince($1.startDate) / 60 }

                continuation.resume(returning: minutes > 0 ? minutes : nil)
            }
            store.execute(query)
        }
    }

    private func recentWorkouts() async -> [WatchWorkout] {
        let start = Calendar.current.date(byAdding: .day, value: -30, to: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: .workoutType(),
                predicate: predicate,
                limit: 40,
                sortDescriptors: [sort]
            ) { [log] _, samples, error in
                if let error {
                    log.error("workouts: \(error.localizedDescription, privacy: .public)")
                    continuation.resume(returning: [])
                    return
                }

                let workouts = (samples as? [HKWorkout] ?? []).map { workout in
                    WatchWorkout(
                        id: workout.uuid,
                        name: workout.workoutActivityType.displayName,
                        start: workout.startDate,
                        end: workout.endDate,
                        durationSeconds: workout.duration,
                        activeCalories: workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
                        averageHeartRate: nil
                    )
                }
                continuation.resume(returning: workouts)
            }
            store.execute(query)
        }
    }
}

enum HealthAccess: Equatable {
    case unknown
    case unavailable
    case needed
    case authorized
    case denied
}

private extension HKWorkoutActivityType {
    var displayName: String {
        switch self {
        case .traditionalStrengthTraining: return "Strength"
        case .functionalStrengthTraining: return "Functional strength"
        case .running: return "Run"
        case .walking: return "Walk"
        case .cycling: return "Ride"
        case .swimming: return "Swim"
        case .yoga: return "Yoga"
        case .coreTraining: return "Core"
        case .highIntensityIntervalTraining: return "HIIT"
        case .elliptical: return "Elliptical"
        case .rowing: return "Row"
        case .hiking: return "Hike"
        case .cooldown: return "Cooldown"
        case .flexibility: return "Mobility"
        case .mixedCardio: return "Cardio"
        case .other: return "Workout"
        default: return "Workout"
        }
    }
}
