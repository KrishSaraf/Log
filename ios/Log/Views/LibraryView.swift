import SwiftUI

struct LibraryView: View {
    @State private var query = ""
    private let exercises = CatalogExercise.all()

    private var filtered: [CatalogExercise] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return exercises }
        return exercises.filter {
            $0.name.lowercased().contains(q)
                || $0.bodyPart.lowercased().contains(q)
                || $0.target.lowercased().contains(q)
                || $0.equipment.lowercased().contains(q)
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                Text("\(exercises.count) movements")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
                    .padding(.bottom, 12)

                ForEach(filtered) { exercise in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(exercise.name)
                            .font(.system(size: 16, weight: .semibold, design: .serif))
                            .foregroundStyle(Palette.ink)
                        Text("\(exercise.bodyPart)  ·  \(exercise.target)  ·  \(exercise.equipment)")
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.muted)
                    }
                    .padding(.vertical, 10)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(Palette.line).frame(height: 1)
                    }
                }
            }
            .padding(20)
        }
        .background(Palette.bg.ignoresSafeArea())
        .navigationTitle("Library")
        .searchable(text: $query, prompt: "Search movements")
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
}
