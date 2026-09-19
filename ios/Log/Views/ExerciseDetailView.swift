import SwiftUI

struct ExerciseDetailView: View {
    let exercise: CatalogExercise
    @State private var frame = 0

    private var photos: [URL] { exercise.photoURLs }
    private var currentURL: URL? {
        guard !photos.isEmpty else { return nil }
        return photos[min(max(frame, 0), photos.count - 1)]
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                photoBlock

                VStack(alignment: .leading, spacing: 6) {
                    Text(exercise.name)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(exercise.bodyPart.capitalized)  ·  \(exercise.level.capitalized)")
                        .font(.system(size: 14))
                        .foregroundStyle(Palette.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }

                HStack(alignment: .top, spacing: 10) {
                    metaCard(label: "Target", value: exercise.target.capitalized)
                    metaCard(label: "Equipment", value: exercise.equipment.capitalized)
                }

                if !exercise.secondaryMuscles.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        SectionLabel(text: "ALSO WORKS")
                        Text(exercise.secondaryMuscles.map { $0.capitalized }.joined(separator: "  ·  "))
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.muted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                if !exercise.instructions.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        SectionLabel(text: "HOW TO")
                        ForEach(Array(exercise.instructions.enumerated()), id: \.offset) { index, step in
                            HStack(alignment: .top, spacing: 12) {
                                Text("\(index + 1)")
                                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                                    .monospacedDigit()
                                    .foregroundStyle(Color.white)
                                    .frame(width: 22, height: 22)
                                    .background(Circle().fill(Palette.accent))
                                Text(step)
                                    .font(.system(size: 15))
                                    .foregroundStyle(Palette.ink.opacity(0.92))
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Palette.bg.ignoresSafeArea())
        .navigationTitle("Exercise")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var photoBlock: some View {
        VStack(spacing: 10) {
            Button {
                guard photos.count > 1 else { return }
                frame = (frame + 1) % photos.count
            } label: {
                ExercisePhoto(url: currentURL, maxPixel: 900)
                    .frame(maxWidth: .infinity)
                    .aspectRatio(4 / 3, contentMode: .fit)
            }
            .buttonStyle(.plain)
            .disabled(photos.count < 2)
            .accessibilityLabel(photos.isEmpty ? "No photo" : "Photo \(frame + 1) of \(photos.count)")

            if photos.count > 1 {
                HStack(spacing: 8) {
                    ForEach(Array(photos.enumerated()), id: \.offset) { index, url in
                        Button {
                            frame = index
                        } label: {
                            ExercisePhoto(url: url, maxPixel: 160)
                                .frame(width: 64, height: 48)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .stroke(index == frame ? Palette.ink : Palette.line, lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Photo \(index + 1)")
                    }
                    Spacer(minLength: 0)
                }
                Text("\(frame + 1) / \(photos.count)")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.muted)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(10)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Palette.line, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func metaCard(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.8)
                .foregroundStyle(Palette.muted)
            Text(value)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Palette.line, lineWidth: 1)
        )
    }
}
