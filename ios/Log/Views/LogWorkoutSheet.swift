import SwiftUI
import SwiftData

struct DraftSet: Identifiable {
    let id = UUID()
    var reps: String = "8"
    var weight: String = ""
}

struct DraftExercise: Identifiable {
    let id = UUID()
    var name: String = ""
    var sets: [DraftSet] = [DraftSet()]
}

struct LogWorkoutSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var name = "Session"
    @State private var notes = ""
    @State private var exercises = [DraftExercise()]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    field("Name", text: $name)
                    field("Notes", text: $notes, placeholder: "Optional")

                    ForEach($exercises) { $exercise in
                        VStack(alignment: .leading, spacing: 10) {
                            TextField("Exercise", text: $exercise.name)
                                .font(.system(size: 17, weight: .semibold, design: .serif))
                                .foregroundStyle(Palette.ink)

                            ForEach($exercise.sets) { $set in
                                HStack(spacing: 10) {
                                    labeledField("Reps", text: $set.reps)
                                    labeledField("kg", text: $set.weight)
                                }
                            }

                            Button("Add set") {
                                exercise.sets.append(DraftSet())
                            }
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Palette.rust)
                        }
                        .padding(.vertical, 8)
                        .overlay(alignment: .bottom) {
                            Rectangle().fill(Palette.line).frame(height: 1)
                        }
                    }

                    Button("Add exercise") {
                        exercises.append(DraftExercise())
                    }
                    .font(.system(size: 15, weight: .semibold, design: .serif))
                    .foregroundStyle(Palette.rust)

                    PrimaryButton(title: "Save workout") {
                        save()
                    }
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle("Log workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Palette.muted)
                }
            }
            .toolbarBackground(Palette.bg, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .presentationDetents([.large])
    }

    private func field(_ title: String, text: Binding<String>, placeholder: String = "") -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: title.uppercased())
            TextField(placeholder.isEmpty ? title : placeholder, text: text)
                .font(.system(size: 17))
                .foregroundStyle(Palette.ink)
                .padding(.bottom, 8)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(Palette.line).frame(height: 1)
                }
        }
    }

    private func labeledField(_ title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Palette.muted)
            TextField("0", text: text)
                .keyboardType(.decimalPad)
                .font(.system(size: 20, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Palette.ink)
                .padding(10)
                .background(Palette.surface)
                .overlay(Rectangle().stroke(Palette.line, lineWidth: 1))
        }
    }

    private func save() {
        let workout = LoggedWorkout(name: name.trimmingCharacters(in: .whitespacesAndNewlines), notes: notes)
        for (index, draft) in exercises.enumerated() {
            let title = draft.name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !title.isEmpty else { continue }
            let exercise = LoggedExercise(name: title, orderIndex: index)
            for (setIndex, set) in draft.sets.enumerated() {
                let reps = Int(set.reps) ?? 0
                let kg = Double(set.weight) ?? 0
                guard reps > 0 || kg > 0 else { continue }
                exercise.sets.append(LoggedSet(setIndex: setIndex, reps: reps, weightKg: kg))
            }
            workout.exercises.append(exercise)
        }
        modelContext.insert(workout)
        dismiss()
    }
}
