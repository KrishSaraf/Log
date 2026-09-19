import Foundation

struct HealthSnapshot: Equatable {
    var steps: Double?
    var activeCalories: Double?
    var exerciseMinutes: Double?
    var standHours: Double?
    var restingHeartRate: Double?
    var averageHeartRate: Double?
    var sleepMinutes: Double?
    var weightKg: Double?
    var lastUpdated: Date?
    var workouts: [WatchWorkout]

    static let empty = HealthSnapshot(workouts: [])

    var sleepHours: Double? {
        guard let sleepMinutes else { return nil }
        return sleepMinutes / 60
    }
}

struct WatchWorkout: Identifiable, Equatable {
    let id: UUID
    let name: String
    let start: Date
    let end: Date
    let durationSeconds: TimeInterval
    let activeCalories: Double?
    let averageHeartRate: Double?
}
