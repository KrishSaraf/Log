import SwiftUI

struct LibraryView: View {
    @State private var query = ""
    @State private var bodyPart: String?
    @State private var equipment: String?
    private let exercises = CatalogExercise.all()
    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    private var filtered: [CatalogExercise] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return exercises.filter { exercise in
            if let bodyPart, exercise.bodyPart != bodyPart { return false }
            if let equipment, exercise.equipment != equipment { return false }
            guard !q.isEmpty else { return true }
            return exercise.name.lowercased().contains(q)
                || exercise.bodyPart.lowercased().contains(q)
                || exercise.target.lowercased().contains(q)
                || exercise.equipment.lowercased().contains(q)
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                filterRow(title: "Body", options: CatalogExercise.bodyParts, selection: $bodyPart)
                filterRow(title: "Gear", options: CatalogExercise.equipment, selection: $equipment)

                Text("\(filtered.count) of \(exercises.count)")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)

                if filtered.isEmpty {
                    Text("No movements match.")
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.muted)
                        .padding(.top, 24)
                        .frame(maxWidth: .infinity)
                } else {
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(filtered) { exercise in
                            NavigationLink {
                                ExerciseDetailView(exercise: exercise)
                            } label: {
                                LibraryCard(exercise: exercise)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 28)
        }
        .background(Palette.bg.ignoresSafeArea())
        .navigationTitle("Library")
        .navigationBarTitleDisplayMode(.large)
        .searchable(text: $query, prompt: "Search movements")
    }

    private func filterRow(title: String, options: [String], selection: Binding<String?>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.8)
                .foregroundStyle(Palette.muted)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(title: "All", selected: selection.wrappedValue == nil) {
                        selection.wrappedValue = nil
                    }
                    ForEach(options, id: \.self) { option in
                        FilterChip(title: option.capitalized, selected: selection.wrappedValue == option) {
                            selection.wrappedValue = selection.wrappedValue == option ? nil : option
                        }
                    }
                }
            }
        }
    }
}

private struct FilterChip: View {
    let title: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: selected ? .semibold : .medium))
                .foregroundStyle(selected ? Palette.onAccent : Palette.ink)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(
                    Capsule(style: .continuous)
                        .fill(selected ? Palette.accent : Palette.surface)
                )
                .overlay(
                    Capsule(style: .continuous)
                        .stroke(selected ? Color.clear : Palette.line, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

private struct LibraryCard: View {
    let exercise: CatalogExercise

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ExercisePhoto(url: exercise.coverURL, maxPixel: 420)
                .aspectRatio(4 / 3, contentMode: .fit)
                .overlay(alignment: .topLeading) {
                    Text(exercise.bodyPart.capitalized)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Capsule(style: .continuous).fill(.black.opacity(0.55)))
                        .padding(8)
                }

            VStack(alignment: .leading, spacing: 4) {
                Text(exercise.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, minHeight: 36, alignment: .topLeading)
                Text(exercise.equipment.capitalized)
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.muted)
                    .lineLimit(1)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 10)
        }
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Palette.line, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(exercise.name), \(exercise.bodyPart), \(exercise.equipment)")
    }
}
