import SwiftData
import SwiftUI

struct MealReviewSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync

    let jpeg: Data
    let preview: UIImage

    @State private var reading = true
    @State private var failed = false
    @State private var draft: PhotoAPI.MealDraft?
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
                        .frame(maxWidth: .infinity, alignment: .leading)
                    } else if let draft {
                        result(draft)
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
            .navigationTitle(saved ? "Logged" : "Meal")
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

    @ViewBuilder
    private func result(_ draft: PhotoAPI.MealDraft) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(draft.mealName.isEmpty ? "Meal" : draft.mealName)
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(draft.mealType)
                .font(.system(size: 14))
                .foregroundStyle(Palette.muted)
        }

        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text("\(draft.calories)")
                .font(.system(size: 44, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Palette.ink)
            Text("kcal")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Palette.muted)
        }

        HStack(spacing: 16) {
            QuietStat(label: "Protein", value: "\(draft.proteinG)", unit: "g")
            QuietStat(label: "Carbs", value: "\(draft.carbsG ?? 0)", unit: "g")
            QuietStat(label: "Fat", value: "\(draft.fatG ?? 0)", unit: "g")
        }

        if !draft.foods.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "BREAKDOWN")
                ForEach(Array(draft.foods.enumerated()), id: \.offset) { _, food in
                    HStack(alignment: .firstTextBaseline) {
                        Text(food.name)
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 8)
                        Text("\(food.calories) kcal")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Palette.muted)
                    }
                }
            }
        }
    }

    private func run() async {
        do {
            let result = try await PhotoAPI.analyzeMealPhoto(jpeg)
            draft = result
            reading = false
            save(result)
            saved = true
        } catch {
            reading = false
            failed = true
        }
    }

    private func save(_ draft: PhotoAPI.MealDraft) {
        context.insert(
            MealLog(
                day: DayStamp.today(),
                name: draft.mealName.isEmpty ? (draft.foods.first?.name ?? "Meal") : draft.mealName,
                mealType: draft.mealType.isEmpty ? "Lunch" : draft.mealType,
                calories: draft.calories,
                proteinG: draft.proteinG,
                carbsG: draft.carbsG ?? 0,
                fatG: draft.fatG ?? 0,
                needsPush: true
            )
        )
        try? context.save()
        sync.pushQuietly(context: context)
    }
}
