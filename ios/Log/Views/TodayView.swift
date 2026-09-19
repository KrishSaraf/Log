import SwiftUI
import SwiftData
import UIKit

struct TodayView: View {
    @Environment(HealthKitService.self) private var health
    @Environment(\.modelContext) private var context
    @Query(sort: \Habit.orderIndex) private var habits: [Habit]
    @Query private var entries: [HabitEntry]
    @Query(sort: \LoggedWorkout.date, order: .reverse) private var logged: [LoggedWorkout]
    @Query(sort: \MealLog.createdAt, order: .reverse) private var meals: [MealLog]
    @Query(sort: \WeightSample.day, order: .reverse) private var weights: [WeightSample]
    @State private var loggingWorkout = false
    @State private var loggingMeal = false

    private var day: String { DayStamp.today() }
    private var activeHabits: [Habit] { habits.filter(\.isActive) }
    private var todaysMeals: [MealLog] { meals.filter { $0.day == day } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if health.access != .authorized {
                        AccessBanner(access: health.access, action: handleAccess)
                    } else {
                        DayStrip(
                            calories: health.snapshot.activeCalories,
                            exercise: health.snapshot.exerciseMinutes,
                            stand: health.snapshot.standHours
                        )
                        HStack(alignment: .top, spacing: 16) {
                            QuietStat(label: "Steps", value: Formatters.int(health.snapshot.steps), unit: "")
                            QuietStat(label: "Sleep", value: Formatters.oneDecimal(health.snapshot.sleepHours), unit: "hr")
                            QuietStat(
                                label: "Weight",
                                value: Formatters.oneDecimal(weights.first?.kg ?? health.snapshot.weightKg),
                                unit: "kg"
                            )
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        SectionLabel(text: "TODAY’S HABITS")
                        ForEach(activeHabits, id: \.key) { habit in
                            HStack {
                                Text(habit.label)
                                    .font(.system(size: 16, design: .serif))
                                    .foregroundStyle(Palette.ink)
                                Spacer()
                                TickControl(
                                    value: HabitActions.value(entries: entries, key: habit.key, day: day)
                                ) { next in
                                    HabitActions.set(
                                        context: context,
                                        entries: entries,
                                        key: habit.key,
                                        day: day,
                                        value: next
                                    )
                                }
                            }
                        }
                    }

                    HStack(spacing: 10) {
                        Button("Log workout") { loggingWorkout = true }
                            .buttonStyle(BlockButtonStyle())
                        Button("Log meal") { loggingMeal = true }
                            .buttonStyle(BlockButtonStyle(filled: false))
                    }

                    if !todaysMeals.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            SectionLabel(text: "FOOD")
                            Text("\(todaysMeals.reduce(0) { $0 + $1.calories }) kcal  ·  \(todaysMeals.reduce(0) { $0 + $1.proteinG })g protein")
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(Palette.ink)
                            ForEach(todaysMeals, id: \.id) { meal in
                                Text("\(meal.name)  \(meal.calories) kcal")
                                    .font(.system(size: 14))
                                    .foregroundStyle(Palette.muted)
                            }
                        }
                    }

                    if let mine = logged.first {
                        VStack(alignment: .leading, spacing: 8) {
                            SectionLabel(text: "LAST SESSION")
                            LoggedWorkoutRow(workout: mine)
                        }
                    } else if let watch = health.snapshot.workouts.first {
                        VStack(alignment: .leading, spacing: 8) {
                            SectionLabel(text: "FROM WATCH")
                            WatchWorkoutRow(workout: watch)
                        }
                    }
                }
                .padding(20)
            }
            .refreshable { await health.refresh() }
            .modifier(Screen())
            .navigationTitle("Today")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $loggingWorkout) { LogWorkoutSheet() }
            .sheet(isPresented: $loggingMeal) { LogMealSheet() }
        }
    }

    private func handleAccess() {
        if health.access == .denied, let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
            return
        }
        Task { await health.requestAccess() }
    }
}

struct BlockButtonStyle: ButtonStyle {
    var filled = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold, design: .serif))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .foregroundStyle(filled ? Palette.ink : Palette.ink)
            .background(filled ? Palette.rust : Palette.surface)
            .overlay(Rectangle().stroke(Palette.line, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
