import Foundation

/// Pushes HealthKit snapshot samples into the dashboard hub schema
/// (`health_metrics` + `connected_sources`) so web Today fills from the phone.
enum HealthKitRemoteSync {
    @MainActor
    static func pushSnapshot(_ snapshot: HealthSnapshot, access: HealthAccess) async {
        guard access == .authorized else { return }

        let day = DayStamp.today()
        var entries: [[String: Any]] = []

        func add(_ metric: String, _ value: Double?, unit: String) {
            guard let value, value > 0 else { return }
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

        if let sleep = snapshot.sleepMinutes, sleep > 0 {
            _ = await APIClient.sendFirstOK(
                method: "POST",
                paths: ["/api/health/sleep"],
                json: [
                    "date": day,
                    "totalMinutes": Int(sleep.rounded()),
                    "source": "apple_health",
                ]
            )
        }

        if !entries.isEmpty {
            _ = await APIClient.sendFirstOK(
                method: "POST",
                paths: ["/api/health/metrics"],
                json: [
                    "date": day,
                    "source": "apple_health",
                    "entries": entries,
                ]
            )
        }

        _ = await APIClient.sendFirstOK(
            method: "POST",
            paths: ["/api/settings/connections"],
            json: [
                "provider": "apple_health",
                "status": "connected",
                "displayName": "Apple Health",
            ]
        )
    }
}
