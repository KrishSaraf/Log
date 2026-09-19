import SwiftUI
import UIKit

struct HealthView: View {
    @Environment(HealthKitService.self) private var health

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if health.access != .authorized {
                        AccessBanner(access: health.access, action: handleAccess)
                    } else {
                        MetricTile(label: "Weight", value: Formatters.oneDecimal(health.snapshot.weightKg), unit: "kg")
                        MetricTile(label: "Heart rate, today", value: Formatters.int(health.snapshot.averageHeartRate), unit: "bpm avg")
                        MetricTile(label: "Resting heart rate", value: Formatters.int(health.snapshot.restingHeartRate), unit: "bpm")
                        MetricTile(label: "Sleep last night", value: Formatters.oneDecimal(health.snapshot.sleepHours), unit: "hr")
                        MetricTile(label: "Steps today", value: Formatters.int(health.snapshot.steps), unit: "")

                        if let updated = health.snapshot.lastUpdated {
                            Text("Updated \(Formatters.time(updated))")
                                .font(.system(size: 12))
                                .foregroundStyle(Palette.muted)
                        }
                    }
                }
                .padding(16)
            }
            .refreshable { await health.refresh() }
            .modifier(Screen())
            .navigationTitle("Health")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
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
