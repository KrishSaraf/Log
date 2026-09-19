import SwiftUI
import SwiftData
import UIKit

struct NutritionView: View {
    @Query(sort: \MealLog.createdAt, order: .reverse) private var meals: [MealLog]
    @State private var logging = false

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
                        Text("No meals yet. Snap was on the website — here you log the meal in a few fields.")
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.muted)
                    } else {
                        SectionLabel(text: "RECENT")
                        ForEach(meals, id: \.id) { meal in
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
                }
                .padding(20)
            }
            .modifier(Screen())
            .navigationTitle("Food")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $logging) { LogMealSheet() }
        }
    }
}

struct LogMealSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @State private var name = ""
    @State private var mealType = "Lunch"
    @State private var calories = ""
    @State private var protein = ""
    private let types = ["Breakfast", "Lunch", "Dinner", "Snack"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    labeled("Meal", text: $name)
                    Picker("Type", selection: $mealType) {
                        ForEach(types, id: \.self) { Text($0) }
                    }
                    .pickerStyle(.segmented)
                    labeled("Calories", text: $calories, keyboard: .numberPad)
                    labeled("Protein (g)", text: $protein, keyboard: .numberPad)
                    PrimaryButton(title: "Save meal") { save() }
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle("Log meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(Palette.muted)
                }
            }
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
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
        let meal = MealLog(
            day: DayStamp.today(),
            name: name.isEmpty ? mealType : name,
            mealType: mealType,
            calories: Int(calories) ?? 0,
            proteinG: Int(protein) ?? 0
        )
        context.insert(meal)
        dismiss()
    }
}
