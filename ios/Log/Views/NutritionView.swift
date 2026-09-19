import SwiftUI
import SwiftData
import UIKit

struct NutritionView: View {
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync
    @Query(sort: \MealLog.createdAt, order: .reverse) private var meals: [MealLog]
    @State private var logging = false
    @State private var editing: MealLog?

    private var day: String { DayStamp.today() }
    private var today: [MealLog] { meals.filter { $0.day == day } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(alignment: .top, spacing: 16) {
                        QuietStat(label: "Calories today", value: today.isEmpty ? "—" : "\(today.reduce(0) { $0 + $1.calories })", unit: "kcal")
                        QuietStat(label: "Protein", value: today.isEmpty ? "—" : "\(today.reduce(0) { $0 + $1.proteinG })", unit: "g")
                    }

                    Button("Log meal") { logging = true }
                        .buttonStyle(BlockButtonStyle())

                    if meals.isEmpty {
                        Text("No meals yet.")
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.muted)
                    } else {
                        SectionLabel(text: "RECENT")
                        ForEach(meals, id: \.id) { meal in
                            Button { editing = meal } label: {
                                MealRow(meal: meal)
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                Button("Edit") { editing = meal }
                                Button("Delete", role: .destructive) { delete(meal) }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .refreshable { await sync.refresh(context: context) }
            .modifier(Screen())
            .navigationTitle("Food")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $logging) { LogMealSheet() }
            .sheet(item: $editing) { meal in
                LogMealSheet(meal: meal)
            }
        }
    }

    private func delete(_ meal: MealLog) {
        if let remote = meal.remoteId, !remote.isEmpty {
            context.insert(SyncTombstone(kind: "meal", remoteId: remote))
        }
        context.delete(meal)
        try? context.save()
        sync.pushQuietly(context: context)
    }
}

struct MealRow: View {
    let meal: MealLog

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 3) {
                Text(meal.name)
                    .font(.system(size: 16, weight: .semibold, design: .serif))
                    .foregroundStyle(Palette.ink)
                Text("\(DayStamp.pretty(meal.day))  ·  \(meal.mealType)")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
            }
            Spacer()
            Text("\(meal.calories) kcal")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Palette.ink)
        }
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Palette.line).frame(height: 1)
        }
    }
}

struct LogMealSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync

    var meal: MealLog?

    @State private var name = ""
    @State private var mealType = "Lunch"
    @State private var calories = ""
    @State private var protein = ""
    @State private var date = Date()
    @State private var didLoad = false
    private let types = ["Breakfast", "Lunch", "Dinner", "Snack"]

    private var isEditing: Bool { meal != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    labeled("Meal", text: $name)
                    DatePicker("Day", selection: $date, displayedComponents: .date)
                        .font(.system(size: 16, design: .serif))
                        .foregroundStyle(Palette.ink)
                    Picker("Type", selection: $mealType) {
                        ForEach(types, id: \.self) { Text($0) }
                    }
                    .pickerStyle(.segmented)
                    labeled("Calories", text: $calories, keyboard: .numberPad)
                    labeled("Protein (g)", text: $protein, keyboard: .numberPad)
                    PrimaryButton(title: isEditing ? "Save changes" : "Save meal") { save() }

                    if isEditing {
                        Button("Delete meal", role: .destructive) { deleteMeal() }
                            .font(.system(size: 15, weight: .semibold, design: .serif))
                            .foregroundStyle(Palette.muted)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle(isEditing ? "Edit meal" : "Log meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(Palette.muted)
                }
            }
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .onAppear { loadIfNeeded() }
    }

    private func loadIfNeeded() {
        guard !didLoad else { return }
        didLoad = true
        guard let meal else { return }
        name = meal.name
        mealType = types.contains(meal.mealType) ? meal.mealType : meal.mealType.capitalized
        calories = meal.calories > 0 ? "\(meal.calories)" : ""
        protein = meal.proteinG > 0 ? "\(meal.proteinG)" : ""
        date = DayStamp.date(from: meal.day) ?? .now
    }

    private func labeled(_ title: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel(text: title.uppercased())
            TextField(title, text: text)
                .keyboardType(keyboard)
                .font(.system(size: 17))
                .foregroundStyle(Palette.ink)
                .padding(.bottom, 8)
                .overlay(alignment: .bottom) { Rectangle().fill(Palette.line).frame(height: 1) }
        }
    }

    private func save() {
        let day = DayStamp.from(date)
        let title = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if let meal {
            meal.name = title.isEmpty ? mealType : title
            meal.mealType = mealType
            meal.day = day
            meal.calories = Int(calories) ?? 0
            meal.proteinG = Int(protein) ?? 0
            meal.needsPush = true
            meal.updatedAt = .now
        } else {
            context.insert(
                MealLog(
                    day: day,
                    name: title.isEmpty ? mealType : title,
                    mealType: mealType,
                    calories: Int(calories) ?? 0,
                    proteinG: Int(protein) ?? 0,
                    needsPush: true
                )
            )
        }
        try? context.save()
        sync.pushQuietly(context: context)
        dismiss()
    }

    private func deleteMeal() {
        guard let meal else { return }
        if let remote = meal.remoteId, !remote.isEmpty {
            context.insert(SyncTombstone(kind: "meal", remoteId: remote))
        }
        context.delete(meal)
        try? context.save()
        sync.pushQuietly(context: context)
        dismiss()
    }
}
