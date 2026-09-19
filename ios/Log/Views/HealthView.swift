import SwiftUI
import UIKit

struct HealthView: View {
    @Environment(HealthKitService.self) private var health

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if health.access != .authorized {
                        AccessBanner(access: health.access, action: handleAccess)
                    } else {
                        DayStrip(
                            calories: health.snapshot.activeCalories,
                            exercise: health.snapshot.exerciseMinutes,
                            stand: health.snapshot.standHours
                        )
                        stat("Weight", Formatters.oneDecimal(health.snapshot.weightKg), "kg")
                        stat("Heart rate today", Formatters.int(health.snapshot.averageHeartRate), "bpm avg")
                        stat("Resting heart rate", Formatters.int(health.snapshot.restingHeartRate), "bpm")
                        stat("Sleep last night", Formatters.oneDecimal(health.snapshot.sleepHours), "hr")
                        stat("Steps today", Formatters.int(health.snapshot.steps), "")
                    }
                }
                .padding(20)
            }
            .refreshable { await health.refresh() }
            .modifier(Screen())
            .navigationTitle("Health")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func stat(_ label: String, _ value: String, _ unit: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.system(size: 16, design: .serif))
                .foregroundStyle(Palette.ink)
            Spacer()
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                if value != "—" && !unit.isEmpty {
                    Text(unit)
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.muted)
                }
            }
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Palette.line).frame(height: 1)
        }
    }

    private func handleAccess() {
        if health.access == .denied, let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
            return
        }
        Task { await health.requestAccess() }
    }
}
