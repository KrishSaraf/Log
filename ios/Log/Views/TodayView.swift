import SwiftUI
import UIKit

struct TodayView: View {
    @Environment(HealthKitService.self) private var health

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if health.access != .authorized {
                        AccessBanner(access: health.access, action: handleAccess)
                    } else {
                        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                            MetricTile(label: "Move", value: Formatters.int(health.snapshot.activeCalories), unit: "kcal", tint: Palette.move)
                            MetricTile(label: "Exercise", value: Formatters.int(health.snapshot.exerciseMinutes), unit: "min", tint: Palette.exercise)
                            MetricTile(label: "Stand", value: Formatters.oneDecimal(health.snapshot.standHours), unit: "hr", tint: Palette.stand)
                            MetricTile(label: "Steps", value: Formatters.int(health.snapshot.steps), unit: "")
                            MetricTile(label: "Sleep", value: Formatters.oneDecimal(health.snapshot.sleepHours), unit: "hr")
                            MetricTile(label: "Resting HR", value: Formatters.int(health.snapshot.restingHeartRate), unit: "bpm")
                        }

                        if let workout = health.snapshot.workouts.first {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("LATEST WORKOUT")
                                    .font(.system(size: 11, weight: .semibold))
                                    .tracking(0.8)
                                    .foregroundStyle(Palette.muted)
                                WorkoutRow(workout: workout)
                            }
                        }

                        if health.loadFailed {
                            Text("Couldn’t refresh. Pull down to try again.")
                                .font(.system(size: 13))
                                .foregroundStyle(Palette.muted)
                        }
                    }
                }
                .padding(16)
            }
            .refreshable {
                await health.refresh()
            }
            .modifier(Screen())
            .navigationTitle("Today")
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
