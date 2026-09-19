import SwiftData
import SwiftUI

struct WorkoutReviewSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync

    let jpeg: Data
    let preview: UIImage

    @State private var reading = true
    @State private var failed = false
    @State private var draft: PhotoAPI.WorkoutDraft?
    @State private var saved = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Image(uiImage: preview)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 220)
                        .clipped()
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                    if reading {
                        HStack(spacing: 10) {
                            ProgressView().tint(Palette.ink)
                            Text("Reading photo…")
                                .font(.system(size: 16))
                                .foregroundStyle(Palette.muted)
                        }
                    } else if let draft {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(draft.name)
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundStyle(Palette.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            ForEach(Array(draft.exercises.enumerated()), id: \.offset) { _, exercise in
                                Text(exercise.line)
                                    .font(.system(size: 15))
                                    .foregroundStyle(Palette.muted)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    } else {
                        Text("Couldn't read that photo. Try another, or log it yourself.")
                            .font(.system(size: 16))
                            .foregroundStyle(Palette.muted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle(saved ? "Logged" : "Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(saved || failed ? "Done" : "Cancel") { dismiss() }
                        .foregroundStyle(Palette.ink)
                }
            }
        }
        .task { await run() }
        .interactiveDismissDisabled(reading)
    }

    private func run() async {
        do {
            let result = try await PhotoAPI.analyzeWorkout(jpeg)
            draft = result
            reading = false
            save(result)
            saved = true
        } catch {
            reading = false
            failed = true
        }
    }

    private func save(_ draft: PhotoAPI.WorkoutDraft) {
        let workout = LoggedWorkout(name: draft.name, date: .now, needsPush: true)
        for (index, exercise) in draft.exercises.enumerated() {
            let logged = LoggedExercise(name: exercise.name, orderIndex: index)
            if exercise.reps > 0 || exercise.weightKg > 0 {
                logged.sets.append(LoggedSet(setIndex: 0, reps: exercise.reps, weightKg: exercise.weightKg))
            }
            workout.exercises.append(logged)
        }
        context.insert(workout)
        try? context.save()
        sync.pushQuietly(context: context)
    }
}
