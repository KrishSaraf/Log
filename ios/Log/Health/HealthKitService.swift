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
        let start = Calendar.current.date(byAdding: .day, value: -90, to: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)

        return await withCheckedContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: .workoutType(),
                predicate: predicate,
                limit: 80,
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
        case .americanFootball: return "Football"
        case .archery: return "Archery"
        case .australianFootball: return "AFL"
        case .badminton: return "Badminton"
        case .baseball: return "Baseball"
        case .basketball: return "Basketball"
        case .bowling: return "Bowling"
        case .boxing: return "Boxing"
        case .climbing: return "Climbing"
        case .cricket: return "Cricket"
        case .crossTraining: return "Cross training"
        case .curling: return "Curling"
        case .cycling: return "Ride"
        case .dance: return "Dance"
        case .danceInspiredTraining: return "Dance"
        case .elliptical: return "Elliptical"
        case .equestrianSports: return "Riding"
        case .fencing: return "Fencing"
        case .fishing: return "Fishing"
        case .functionalStrengthTraining: return "Strength"
        case .golf: return "Golf"
        case .gymnastics: return "Gymnastics"
        case .handball: return "Handball"
        case .hiking: return "Hike"
        case .hockey: return "Hockey"
        case .hunting: return "Hunting"
        case .lacrosse: return "Lacrosse"
        case .martialArts: return "Martial arts"
        case .mindAndBody: return "Mind and body"
        case .mixedMetabolicCardioTraining: return "Cardio"
        case .paddleSports: return "Paddle"
        case .play: return "Play"
        case .preparationAndRecovery: return "Recovery"
        case .racquetball: return "Racquetball"
        case .rowing: return "Row"
        case .rugby: return "Rugby"
        case .running: return "Run"
        case .sailing: return "Sailing"
        case .skatingSports: return "Skate"
        case .snowSports: return "Snow"
        case .soccer: return "Soccer"
        case .softball: return "Softball"
        case .squash: return "Squash"
        case .stairClimbing: return "Stairs"
        case .surfingSports: return "Surf"
        case .swimming: return "Swim"
        case .tableTennis: return "Table tennis"
        case .tennis: return "Tennis"
        case .trackAndField: return "Track"
        case .traditionalStrengthTraining: return "Strength"
        case .volleyball: return "Volleyball"
        case .walking: return "Walk"
        case .waterFitness: return "Water fitness"
        case .waterPolo: return "Water polo"
        case .waterSports: return "Water sports"
        case .wrestling: return "Wrestling"
        case .yoga: return "Yoga"
        case .barre: return "Barre"
        case .coreTraining: return "Core"
        case .crossCountrySkiing: return "XC ski"
        case .downhillSkiing: return "Ski"
        case .flexibility: return "Mobility"
        case .highIntensityIntervalTraining: return "HIIT"
        case .jumpRope: return "Jump rope"
        case .kickboxing: return "Kickboxing"
        case .pilates: return "Pilates"
        case .snowboarding: return "Snowboard"
        case .stairs: return "Stairs"
        case .stepTraining: return "Steps"
        case .wheelchairWalkPace: return "Walk"
        case .wheelchairRunPace: return "Run"
        case .taiChi: return "Tai chi"
        case .mixedCardio: return "Cardio"
        case .handCycling: return "Handcycle"
        case .discSports: return "Disc sports"
        case .fitnessGaming: return "Fitness gaming"
        case .cardioDance: return "Dance"
        case .socialDance: return "Dance"
        case .pickleball: return "Pickleball"
        case .cooldown: return "Cooldown"
        case .swimBikeRun: return "Triathlon"
        case .transition: return "Transition"
        case .underwaterDiving: return "Dive"
        case .other: return "Workout"
        default: return Self.fallbackName(rawValue)
        }
    }

    static func fallbackName(_ rawValue: UInt) -> String {
        switch rawValue {
        case 10: return "Cricket"
        case 20: return "Strength"
        case 37: return "Run"
        case 48: return "Tennis"
        case 50: return "Strength"
        default: return "Workout"
        }
    }
}
