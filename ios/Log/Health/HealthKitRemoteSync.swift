import Foundation

/// Result of pushing a HealthKit snapshot into the dashboard hub.
struct HealthKitSyncResult: Equatable {
    var metricsOk: Bool
    var sleepOk: Bool
    var connectionOk: Bool
    var entryCount: Int
    var at: Date

    var succeeded: Bool { metricsOk || sleepOk || connectionOk }

    static let empty = HealthKitSyncResult(
        metricsOk: false,
        sleepOk: false,
        connectionOk: false,
        entryCount: 0,
        at: .distantPast
    )
}

/// Pushes HealthKit snapshot samples into the dashboard hub schema
/// (`health_metrics` + `connected_sources`) so web Today fills from the phone.
enum HealthKitRemoteSync {
    private static let lastSyncKey = "log.healthkit.lastSync"

    @MainActor
    static var lastSyncAt: Date? {
        get {
            let t = UserDefaults.standard.double(forKey: lastSyncKey)
            guard t > 0 else { return nil }
            return Date(timeIntervalSince1970: t)
        }
        set {
            if let newValue {
                UserDefaults.standard.set(newValue.timeIntervalSince1970, forKey: lastSyncKey)
            } else {
                UserDefaults.standard.removeObject(forKey: lastSyncKey)
            }
        }
    }

    @MainActor
    @discardableResult
    static func pushSnapshot(_ snapshot: HealthSnapshot, access: HealthAccess) async -> HealthKitSyncResult {
        guard access == .authorized else { return .empty }

        let day = DayStamp.today()
        var entries: [[String: Any]] = []

        func add(_ metric: String, _ value: Double?, unit: String) {
            guard let value, value.isFinite, value > 0 else { return }
            entries.append([
                "metric": metric,
                "value": value,
                "unit": unit,
            ])
        }

        add("steps", snapshot.steps, unit: "steps")
        add("active_calories", snapshot.activeCalories, unit: "kcal")
        add("exercise_minutes", snapshot.exerciseMinutes, unit: "min")
        add("stand_hours", snapshot.standHours, unit: "hr")
        add("heart_rate_resting", snapshot.restingHeartRate, unit: "bpm")
        add("heart_rate_avg", snapshot.averageHeartRate, unit: "bpm")
        add("weight_kg", snapshot.weightKg, unit: "kg")

        var sleepOk = false
        if let sleep = snapshot.sleepMinutes, sleep.isFinite, sleep > 0 {
            let result = await APIClient.sendFirstOK(
                method: "POST",
                paths: ["/api/health/sleep"],
                json: [
                    "date": day,
                    "totalMinutes": Int(sleep.rounded()),
                    "source": "apple_health",
                ]
            )
            sleepOk = result != nil
        } else {
            sleepOk = true
        }

        var metricsOk = entries.isEmpty
        if !entries.isEmpty {
            let result = await APIClient.sendFirstOK(
                method: "POST",
                paths: ["/api/health/metrics"],
                json: [
                    "date": day,
                    "source": "apple_health",
                    "entries": entries,
                ]
            )
            metricsOk = result != nil
        }

        let connection = await APIClient.sendFirstOK(
            method: "POST",
            paths: ["/api/settings/connections"],
            json: [
                "provider": "apple_health",
                "status": "connected",
                "displayName": "Apple Health",
            ]
        )
        let connectionOk = connection != nil

        let result = HealthKitSyncResult(
            metricsOk: metricsOk,
            sleepOk: sleepOk,
            connectionOk: connectionOk,
            entryCount: entries.count,
            at: Date()
        )
        if result.succeeded {
            lastSyncAt = result.at
        }
        return result
    }
}
