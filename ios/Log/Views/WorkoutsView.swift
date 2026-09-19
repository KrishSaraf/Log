import SwiftUI
import SwiftData

struct WorkoutsView: View {
    @Environment(HealthKitService.self) private var health
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync
    @Query(sort: \LoggedWorkout.date, order: .reverse) private var logged: [LoggedWorkout]
    @State private var logging = false
    @State private var editing: LoggedWorkout?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 22) {
                    HStack(spacing: 10) {
                        Button("Log workout") { logging = true }
                            .buttonStyle(BlockButtonStyle())
                        NavigationLink {
                            LibraryView()
                        } label: {
                            Text("Library")
                                .font(.system(size: 15, weight: .semibold, design: .serif))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                                .foregroundStyle(Palette.ink)
                                .background(Palette.surface)
                                .overlay(Rectangle().stroke(Palette.line, lineWidth: 1))
                        }
                    }

                    QuietStat(label: "Sessions", value: "\(logged.count)", unit: "")

                    if logged.isEmpty {
                        Text("No sessions yet.")
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.muted)
                    } else {
                        VStack(alignment: .leading, spacing: 10) {
                            SectionLabel(text: "YOURS")
                            ForEach(logged) { workout in
                                Button { editing = workout } label: {
                                    LoggedWorkoutRow(workout: workout)
                                }
                                .buttonStyle(.plain)
                                .contextMenu {
                                    Button("Edit") { editing = workout }
                                    Button("Delete", role: .destructive) { delete(workout) }
                                }
                            }
                        }
                    }

                    if !health.snapshot.workouts.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            SectionLabel(text: "WATCH")
                            ForEach(health.snapshot.workouts) { workout in
                                WatchWorkoutRow(workout: workout)
                            }
                        }
                    }
                }
                .padding(20)
            }
            .refreshable {
                await health.refresh()
                await sync.refresh(context: context)
            }
            .modifier(Screen())
            .navigationTitle("Workouts")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $logging) { LogWorkoutSheet() }
            .sheet(item: $editing) { workout in
                LogWorkoutSheet(workout: workout)
            }
        }
    }

    private func delete(_ workout: LoggedWorkout) {
        if let remote = workout.remoteId, !remote.isEmpty {
            context.insert(SyncTombstone(kind: "workout", remoteId: remote))
        }
        context.delete(workout)
        try? context.save()
        sync.pushQuietly(context: context)
    }
}

struct WatchWorkoutRow: View {
    let workout: WatchWorkout

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(workout.name)
                    .font(.system(size: 17, weight: .semibold, design: .serif))
                    .foregroundStyle(Palette.ink)
                Text("\(Formatters.day(workout.start))  \(Formatters.time(workout.start))")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
            }
            Spacer(minLength: 8)
            Text(Formatters.duration(workout.durationSeconds))
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Palette.ink)
        }
        .padding(.vertical, 12)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Palette.line).frame(height: 1)
        }
    }
}

struct LoggedWorkoutRow: View {
    let workout: LoggedWorkout

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(workout.name.isEmpty ? "Session" : workout.name)
                    .font(.system(size: 17, weight: .semibold, design: .serif))
                    .foregroundStyle(Palette.ink)
                Spacer()
                Text(Formatters.day(workout.date))
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
            }
            ForEach(workout.exercises.sorted(by: { $0.orderIndex < $1.orderIndex })) { exercise in
                Text(summary(exercise))
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.muted)
            }
        }
        .padding(.vertical, 12)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Palette.line).frame(height: 1)
        }
    }

    private func summary(_ exercise: LoggedExercise) -> String {
        let sets = exercise.sets.sorted(by: { $0.setIndex < $1.setIndex })
        let bits = sets.map { set in
            set.weightKg > 0 ? "\(set.reps)×\(Formatters.oneDecimal(set.weightKg))" : "\(set.reps)"
        }
        return bits.isEmpty ? exercise.name : "\(exercise.name)  \(bits.joined(separator: "  "))"
    }
}
