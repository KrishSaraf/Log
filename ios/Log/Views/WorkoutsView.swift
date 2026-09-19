import SwiftUI
import UIKit

struct WorkoutsView: View {
    @Environment(HealthKitService.self) private var health

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if health.access != .authorized {
                        AccessBanner(access: health.access, action: handleAccess)
                    } else if health.snapshot.workouts.isEmpty {
                        EmptyPanel(
                            title: "No workouts yet",
                            message: "Workouts from your Watch will show up here."
                        )
                    } else {
                        ForEach(health.snapshot.workouts) { workout in
                            WorkoutRow(workout: workout)
                        }
                    }
                }
                .padding(16)
            }
            .refreshable { await health.refresh() }
            .modifier(Screen())
            .navigationTitle("Workouts")
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

struct WorkoutRow: View {
    let workout: WatchWorkout

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(workout.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Palette.text)
                Text("\(Formatters.day(workout.start)) · \(Formatters.time(workout.start))")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 4) {
                Text(Formatters.duration(workout.durationSeconds))
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.text)
                if let kcal = workout.activeCalories {
                    Text("\(Formatters.int(kcal)) kcal")
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.muted)
                        .monospacedDigit()
                }
            }
        }
        .padding(16)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Palette.line, lineWidth: 1)
        )
    }
}
