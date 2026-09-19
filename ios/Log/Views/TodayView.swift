import SwiftUI
import SwiftData
import UIKit

struct TodayView: View {
    @Environment(HealthKitService.self) private var health
    @Query(sort: \LoggedWorkout.date, order: .reverse) private var logged: [LoggedWorkout]
    @State private var logging = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    if health.access != .authorized {
                        AccessBanner(access: health.access, action: handleAccess)
                    } else {
                        DayStrip(
                            calories: health.snapshot.activeCalories,
                            exercise: health.snapshot.exerciseMinutes,
                            stand: health.snapshot.standHours
                        )

                        HStack(alignment: .top, spacing: 16) {
                            QuietStat(label: "Steps", value: Formatters.int(health.snapshot.steps), unit: "")
                            QuietStat(label: "Sleep", value: Formatters.oneDecimal(health.snapshot.sleepHours), unit: "hr")
                            QuietStat(label: "Resting", value: Formatters.int(health.snapshot.restingHeartRate), unit: "bpm")
                        }

                        PrimaryButton(title: "Log workout") {
                            logging = true
                        }

                        if let mine = logged.first {
                            VStack(alignment: .leading, spacing: 8) {
                                SectionLabel(text: "LOGGED")
                                LoggedWorkoutRow(workout: mine)
                            }
                        } else if let watch = health.snapshot.workouts.first {
                            VStack(alignment: .leading, spacing: 8) {
                                SectionLabel(text: "FROM WATCH")
                                WatchWorkoutRow(workout: watch)
                            }
                        }

                        if health.loadFailed {
                            Text("No Watch numbers yet. Pull to refresh, or log a workout below.")
                                .font(.system(size: 14))
                                .foregroundStyle(Palette.muted)
                        }
                    }
                }
                .padding(20)
            }
            .refreshable { await health.refresh() }
            .modifier(Screen())
            .navigationTitle("Today")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $logging) {
                LogWorkoutSheet()
            }
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
