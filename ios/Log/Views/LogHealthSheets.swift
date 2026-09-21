import SwiftUI

/// Manual health logging sheets that POST straight to the dashboard API.
enum HealthRemoteLog {
    @MainActor
    static func metric(date: String, metric: String, value: Double, unit: String?) async -> Bool {
        var payload: [String: Any] = [
            "date": date,
            "metric": metric,
            "value": value,
            "source": "manual",
        ]
        if let unit { payload["unit"] = unit }
        return await APIClient.sendFirstOK(
            method: "POST",
            paths: ["/api/health/metrics"],
            json: payload
        ) != nil
    }

    @MainActor
    static func metrics(date: String, entries: [[String: Any]]) async -> Bool {
        let payload: [String: Any] = [
            "date": date,
            "source": "manual",
            "entries": entries,
        ]
        return await APIClient.sendFirstOK(
            method: "POST",
            paths: ["/api/health/metrics"],
            json: payload
        ) != nil
    }

    @MainActor
    static func sleep(date: String, hours: Int, minutes: Int, quality: Int) async -> Bool {
        let payload: [String: Any] = [
            "date": date,
            "hours": hours,
            "minutes": minutes,
            "quality": quality,
            "source": "manual",
        ]
        return await APIClient.sendFirstOK(
            method: "POST",
            paths: ["/api/health/sleep"],
            json: payload
        ) != nil
    }
}

struct LogSleepSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var date = Date()
    @State private var hours = 7
    @State private var minutes = 30
    @State private var quality = 3
    @State private var saving = false
    @State private var failed = false

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Night of", selection: $date, displayedComponents: .date)
                Stepper("Hours: \(hours)", value: $hours, in: 0...16)
                Stepper("Minutes: \(minutes)", value: $minutes, in: 0...59)
                Stepper("Quality: \(quality)/5", value: $quality, in: 1...5)
                if failed {
                    Text("Couldn't reach the website. Check Settings → This phone.")
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.bg)
            .navigationTitle("Sleep")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(saving || (hours == 0 && minutes == 0))
                        .fontWeight(.semibold)
                }
            }
            .tint(Palette.accent)
        }
        .presentationBackground(Palette.bg)
    }

    private func save() async {
        saving = true
        failed = false
        let ok = await HealthRemoteLog.sleep(
            date: DayStamp.from(date),
            hours: hours,
            minutes: minutes,
            quality: quality
        )
        saving = false
        if ok { dismiss() } else { failed = true }
    }
}

struct LogWaterSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var date = Date()
    @State private var glasses = 4
    @State private var saving = false
    @State private var failed = false

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Date", selection: $date, displayedComponents: .date)
                Stepper("Glasses: \(glasses) (\(glasses * 250) ml)", value: $glasses, in: 1...40)
                if failed {
                    Text("Couldn't reach the website. Check Settings → This phone.")
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.bg)
            .navigationTitle("Water")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(saving)
                        .fontWeight(.semibold)
                }
            }
            .tint(Palette.accent)
        }
        .presentationBackground(Palette.bg)
    }

    private func save() async {
        saving = true
        failed = false
        let ok = await HealthRemoteLog.metric(
            date: DayStamp.from(date),
            metric: "water_ml",
            value: Double(glasses * 250),
            unit: "ml"
        )
        saving = false
        if ok { dismiss() } else { failed = true }
    }
}

struct LogVitalsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(HealthKitService.self) private var health
    @State private var date = Date()
    @State private var restingHR = ""
    @State private var systolic = ""
    @State private var diastolic = ""
    @State private var mood = 3
    @State private var energy = 3
    @State private var saving = false
    @State private var failed = false

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Date", selection: $date, displayedComponents: .date)
                TextField("Resting HR (bpm)", text: $restingHR)
                    .keyboardType(.numberPad)
                TextField("Systolic (mmHg)", text: $systolic)
                    .keyboardType(.numberPad)
                TextField("Diastolic (mmHg)", text: $diastolic)
                    .keyboardType(.numberPad)
                Stepper("Mood: \(mood)/5", value: $mood, in: 1...5)
                Stepper("Energy: \(energy)/5", value: $energy, in: 1...5)
                if failed {
                    Text("Couldn't reach the website. Check Settings → This phone.")
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.bg)
            .navigationTitle("Vitals & mood")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(saving)
                        .fontWeight(.semibold)
                }
            }
            .tint(Palette.accent)
            .onAppear {
                if restingHR.isEmpty, let hr = health.snapshot.restingHeartRate {
                    restingHR = String(Int(hr.rounded()))
                }
            }
        }
        .presentationBackground(Palette.bg)
    }

    private func save() async {
        saving = true
        failed = false
        var entries: [[String: Any]] = [
            ["metric": "mood", "value": mood],
            ["metric": "energy", "value": energy],
        ]
        if let hr = Double(restingHR), hr > 0 {
            entries.append(["metric": "heart_rate_resting", "value": hr, "unit": "bpm"])
        }
        if let sys = Double(systolic), sys > 0 {
            entries.append(["metric": "blood_pressure_systolic", "value": sys, "unit": "mmHg"])
        }
        if let dia = Double(diastolic), dia > 0 {
            entries.append(["metric": "blood_pressure_diastolic", "value": dia, "unit": "mmHg"])
        }
        let ok = await HealthRemoteLog.metrics(date: DayStamp.from(date), entries: entries)
        saving = false
        if ok { dismiss() } else { failed = true }
    }
}
