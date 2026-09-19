import SwiftUI
import SwiftData
import UIKit

@Observable
final class DraftSet: Identifiable {
    let id = UUID()
    var reps: String
    var weight: String

    init(reps: String = "8", weight: String = "") {
        self.reps = reps
        self.weight = weight
    }
}

@Observable
final class DraftExercise: Identifiable {
    let id = UUID()
    var name: String
    var sets: [DraftSet]

    init(name: String = "", sets: [DraftSet]? = nil) {
        self.name = name
        self.sets = sets ?? [DraftSet()]
    }
}

@Observable
final class WorkoutDraft {
    var name = "Session"
    var notes = ""
    var date = Date()
    var exercises: [DraftExercise] = [DraftExercise()]
}

struct LogWorkoutSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Environment(SyncEngine.self) private var sync

    var workout: LoggedWorkout?

    @State private var draft = WorkoutDraft()
    @State private var didLoad = false

    private var isEditing: Bool { workout != nil }

    var body: some View {
        @Bindable var draft = draft
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    WorkoutTextField(title: "Name", text: $draft.name)
                    WorkoutDateRow(date: $draft.date)
                    WorkoutTextField(title: "Notes", text: $draft.notes, placeholder: "Optional")

                    ForEach(draft.exercises) { exercise in
                        ExerciseEditor(
                            exercise: exercise,
                            canRemove: draft.exercises.count > 1,
                            onRemove: { draft.exercises.removeAll { $0.id == exercise.id } }
                        )
                    }

                    Button("Add exercise") {
                        draft.exercises.append(DraftExercise())
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Palette.accent)

                    PrimaryButton(title: isEditing ? "Save changes" : "Save workout") {
                        hideKeyboard()
                        save()
                    }

                    if isEditing {
                        Button("Delete workout", role: .destructive) {
                            deleteWorkout()
                        }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.muted)
                        .frame(maxWidth: .infinity)
                        .frame(minHeight: 44)
                    }
                }
                .padding(Palette.Space.screen)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle(isEditing ? "Edit workout" : "Log workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Palette.muted)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { hideKeyboard() }
                }
            }
        }
        .onAppear { loadIfNeeded() }
    }

    private func hideKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }

    private func loadIfNeeded() {
        guard !didLoad else { return }
        didLoad = true
        guard let workout else { return }
        draft.name = workout.name.isEmpty ? "Session" : workout.name
        draft.notes = workout.notes
        draft.date = workout.date
        let loaded = workout.exercises.sorted { $0.orderIndex < $1.orderIndex }.map { exercise in
            let sets = exercise.sets.sorted { $0.setIndex < $1.setIndex }.map { set in
                DraftSet(
                    reps: set.reps > 0 ? "\(set.reps)" : "",
                    weight: set.weightKg > 0 ? String(format: "%g", set.weightKg) : ""
                )
            }
            return DraftExercise(name: exercise.name, sets: sets.isEmpty ? [DraftSet()] : sets)
        }
        draft.exercises = loaded.isEmpty ? [DraftExercise()] : loaded
    }

    private func save() {
        let target = workout ?? LoggedWorkout(
            name: "",
            date: draft.date,
            notes: "",
            needsPush: true
        )
        if workout == nil {
            modelContext.insert(target)
        }

        target.name = draft.name.trimmingCharacters(in: .whitespacesAndNewlines)
        target.notes = draft.notes
        target.date = draft.date
        target.needsPush = true
        target.updatedAt = .now

        for exercise in target.exercises {
            modelContext.delete(exercise)
        }
        target.exercises = []

        for (index, item) in draft.exercises.enumerated() {
            let title = item.name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !title.isEmpty else { continue }
            let exercise = LoggedExercise(name: title, orderIndex: index)
            for (setIndex, set) in item.sets.enumerated() {
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

private struct WorkoutTextField: View {
    let title: String
    @Binding var text: String
    var placeholder: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: title)
            TextField(placeholder.isEmpty ? title : placeholder, text: $text)
                .font(.system(size: 17))
                .foregroundStyle(Palette.ink)
                .padding(.bottom, 8)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(Palette.line).frame(height: 1)
                }
        }
    }
}

private struct WorkoutDateRow: View {
    @Binding var date: Date

    var body: some View {
        DatePicker("Day", selection: $date, displayedComponents: .date)
            .font(.system(size: 16))
            .foregroundStyle(Palette.ink)
            .tint(Palette.accent)
    }
}

private struct ExerciseEditor: View {
    @Bindable var exercise: DraftExercise
    let canRemove: Bool
    let onRemove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                TextField("Exercise", text: $exercise.name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Palette.ink)
                if canRemove {
                    Button("Remove", action: onRemove)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.muted)
                        .frame(minHeight: 44)
                }
            }

            ForEach(exercise.sets) { set in
                SetEditor(
                    set: set,
                    canRemove: exercise.sets.count > 1,
                    onRemove: { exercise.sets.removeAll { $0.id == set.id } }
                )
            }

            Button("Add set") {
                exercise.sets.append(DraftSet())
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(Palette.accent)
            .frame(minHeight: 44)
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Palette.line).frame(height: 1)
        }
    }
}

private struct SetEditor: View {
    @Bindable var set: DraftSet
    let canRemove: Bool
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            numberField("Reps", text: $set.reps, keyboard: .numberPad)
            numberField("kg", text: $set.weight, keyboard: .decimalPad)
            if canRemove {
                Button(action: onRemove) {
                    Image(systemName: "minus.circle")
                        .font(.system(size: 20, weight: .regular))
                        .foregroundStyle(Palette.muted)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Remove set")
            }
        }
    }

    private func numberField(_ title: String, text: Binding<String>, keyboard: UIKeyboardType) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Palette.muted)
            TextField("0", text: text)
                .keyboardType(keyboard)
                .font(.system(size: 20, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Palette.ink)
                .padding(10)
                .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.chip, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Palette.Radius.chip, style: .continuous)
                        .stroke(Palette.line, lineWidth: 1)
                )
        }
    }
}
