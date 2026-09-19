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
    @Environment(SyncEngine.self) private var sync

    var workout: LoggedWorkout?

    @State private var name = "Session"
    @State private var notes = ""
    @State private var date = Date()
    @State private var exercises = [DraftExercise()]
    @State private var didLoad = false

    private var isEditing: Bool { workout != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    field("Name", text: $name)
                    DatePicker("Day", selection: $date, displayedComponents: .date)
                        .font(.system(size: 16, design: .serif))
                        .foregroundStyle(Palette.ink)
                    field("Notes", text: $notes, placeholder: "Optional")

                    ForEach($exercises) { $exercise in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                TextField("Exercise", text: $exercise.name)
                                    .font(.system(size: 17, weight: .semibold, design: .serif))
                                    .foregroundStyle(Palette.ink)
                                if exercises.count > 1 {
                                    Button("Remove") {
                                        exercises.removeAll { $0.id == exercise.id }
                                    }
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Palette.muted)
                                }
                            }

                            ForEach($exercise.sets) { $set in
                                HStack(spacing: 10) {
                                    labeledField("Reps", text: $set.reps)
                                    labeledField("kg", text: $set.weight)
                                    if exercise.sets.count > 1 {
                                        Button {
                                            exercise.sets.removeAll { $0.id == set.id }
                                        } label: {
                                            Image(systemName: "minus.circle")
                                                .foregroundStyle(Palette.muted)
                                        }
                                        .buttonStyle(.plain)
                                        .accessibilityLabel("Remove set")
                                    }
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

                    PrimaryButton(title: isEditing ? "Save changes" : "Save workout") {
                        save()
                    }

                    if isEditing {
                        Button("Delete workout", role: .destructive) {
                            deleteWorkout()
                        }
                        .font(.system(size: 15, weight: .semibold, design: .serif))
                        .foregroundStyle(Palette.muted)
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle(isEditing ? "Edit workout" : "Log workout")
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
        .onAppear { loadIfNeeded() }
    }

    private func loadIfNeeded() {
        guard !didLoad else { return }
        didLoad = true
        guard let workout else { return }
        name = workout.name.isEmpty ? "Session" : workout.name
        notes = workout.notes
        date = workout.date
        let loaded = workout.exercises.sorted { $0.orderIndex < $1.orderIndex }.map { exercise in
            let sets = exercise.sets.sorted { $0.setIndex < $1.setIndex }.map { set in
                DraftSet(
                    reps: set.reps > 0 ? "\(set.reps)" : "",
                    weight: set.weightKg > 0 ? String(format: "%g", set.weightKg) : ""
                )
            }
            return DraftExercise(name: exercise.name, sets: sets.isEmpty ? [DraftSet()] : sets)
        }
        exercises = loaded.isEmpty ? [DraftExercise()] : loaded
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
        let target = workout ?? LoggedWorkout(
            name: "",
            date: date,
            notes: "",
            needsPush: true
        )
        if workout == nil {
            modelContext.insert(target)
        }

        target.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        target.notes = notes
        target.date = date
        target.needsPush = true
        target.updatedAt = .now

        for exercise in target.exercises {
            modelContext.delete(exercise)
        }
        target.exercises = []

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
            target.exercises.append(exercise)
        }

        try? modelContext.save()
        sync.pushQuietly(context: modelContext)
        dismiss()
    }

    private func deleteWorkout() {
        guard let workout else { return }
        if let remote = workout.remoteId, !remote.isEmpty {
            modelContext.insert(SyncTombstone(kind: "workout", remoteId: remote))
        }
        modelContext.delete(workout)
        try? modelContext.save()
        sync.pushQuietly(context: modelContext)
        dismiss()
    }
}
