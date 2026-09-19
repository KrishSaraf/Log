import Foundation
import HealthKit

enum HealthAccess: Equatable {
    case unknown
    case unavailable
    case needed
    case authorized
    case denied
}

@MainActor
@Observable
final class HealthKitService {
    private let store = HKHealthStore()

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
            access = .denied
        }
    }

    func refresh() async {
        isLoading = true
        loadFailed = false
        defer { isLoading = false }

        do {
            async let steps = sum(.stepCount, unit: .count())
            async let calories = sum(.activeEnergyBurned, unit: .kilocalorie())
            async let exercise = sum(.appleExerciseTime, unit: .minute())
            async let stand = sum(.appleStandTime, unit: .hour())
            async let resting = latest(.restingHeartRate, unit: .count().unitDivided(by: .minute()))
            async let avgHR = average(.heartRate, unit: .count().unitDivided(by: .minute()))
            async let weight = latest(.bodyMass, unit: .gramUnit(with: .kilo), dayOnly: false)
            async let sleep = sleepMinutesLastNight()
            async let workouts = recentWorkouts()

            snapshot = HealthSnapshot(
                steps: try await steps,
                activeCalories: try await calories,
                exerciseMinutes: try await exercise,
                standHours: try await stand,
                restingHeartRate: try await resting,
                averageHeartRate: try await avgHR,
                sleepMinutes: try await sleep,
                weightKg: try await weight,
                lastUpdated: Date(),
                workouts: try await workouts
            )
        } catch {
            loadFailed = true
        }
    }

    private func currentAccess() -> HealthAccess {
        // HealthKit does not reveal whether read access was granted.
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

    private func sum(_ id: HKQuantityTypeIdentifier, unit: HKUnit) async throws -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return nil }
        let interval = todayInterval()
        let predicate = HKQuery.predicateForSamples(withStart: interval.start, end: interval.end, options: .strictStartDate)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, stats, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: stats?.sumQuantity()?.doubleValue(for: unit))
            }
            store.execute(query)
        }
    }

    private func average(_ id: HKQuantityTypeIdentifier, unit: HKUnit) async throws -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return nil }
        let interval = todayInterval()
        let predicate = HKQuery.predicateForSamples(withStart: interval.start, end: interval.end, options: .strictStartDate)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: .discreteAverage
            ) { _, stats, error in
                if let error {
                    continuation.resume(throwing: error)
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
    ) async throws -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return nil }
        let start = dayOnly ? todayInterval().start : Calendar.current.date(byAdding: .day, value: -90, to: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictEndDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: 1,
                sortDescriptors: [sort]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let value = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: unit)
                continuation.resume(returning: value)
            }
            store.execute(query)
        }
    }

    private func sleepMinutesLastNight() async throws -> Double? {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return nil }
        let calendar = Calendar.current
        let todayStart = calendar.startOfDay(for: Date())
        guard
            let windowStart = calendar.date(byAdding: .hour, value: -18, to: todayStart),
            let windowEnd = calendar.date(byAdding: .hour, value: 14, to: todayStart)
        else { return nil }

        let predicate = HKQuery.predicateForSamples(withStart: windowStart, end: windowEnd, options: .strictStartDate)
        let asleep: Set<HKCategoryValueSleepAnalysis> = [
            .asleepUnspecified,
            .asleepCore,
            .asleepDeep,
            .asleepREM,
        ]

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: nil
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let minutes = (samples as? [HKCategorySample] ?? [])
                    .filter { sample in
                        guard let value = HKCategoryValueSleepAnalysis(rawValue: sample.value) else { return false }
                        return asleep.contains(value)
                    }
                    .reduce(0.0) { $0 + $1.endDate.timeIntervalSince($1.startDate) / 60 }

                continuation.resume(returning: minutes > 0 ? minutes : nil)
            }
            store.execute(query)
        }
    }

    private func recentWorkouts() async throws -> [WatchWorkout] {
        let start = Calendar.current.date(byAdding: .day, value: -14, to: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: .workoutType(),
                predicate: predicate,
                limit: 20,
                sortDescriptors: [sort]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let workouts = (samples as? [HKWorkout] ?? []).map { workout in
                    let kcal = workout.statistics(for: HKQuantityType(.activeEnergyBurned))?
                        .sumQuantity()?
                        .doubleValue(for: .kilocalorie())
                    let hr = workout.statistics(for: HKQuantityType(.heartRate))?
                        .averageQuantity()?
                        .doubleValue(for: .count().unitDivided(by: .minute()))

                    return WatchWorkout(
                        id: workout.uuid,
                        name: workout.workoutActivityType.name,
                        start: workout.startDate,
                        end: workout.endDate,
                        durationSeconds: workout.duration,
                        activeCalories: kcal,
                        averageHeartRate: hr
                    )
                }
                continuation.resume(returning: workouts)
            }
            store.execute(query)
        }
    }
}

private extension HKWorkoutActivityType {
    var name: String {
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
