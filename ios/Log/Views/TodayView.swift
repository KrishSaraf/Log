import SwiftUI
import SwiftData
import UIKit

struct TodayView: View {
    @Environment(HealthKitService.self) private var health
    @Environment(SyncEngine.self) private var sync
    @Environment(LoggingPreferences.self) private var prefs
    @Environment(\.modelContext) private var context
    @Query(sort: \Habit.orderIndex) private var habits: [Habit]
    @Query private var entries: [HabitEntry]
    @Query(sort: \LoggedWorkout.date, order: .reverse) private var logged: [LoggedWorkout]
    @Query(sort: \MealLog.createdAt, order: .reverse) private var meals: [MealLog]
    @Query(sort: \WeightSample.day, order: .reverse) private var weights: [WeightSample]
    @State private var day = DayStamp.today()
    @State private var loggingWorkout = false
    @State private var loggingMeal = false
    @State private var editingWorkout: LoggedWorkout?
    @State private var editingMeal: MealLog?
    @State private var weightPulse = 0
    @State private var showSettings = false
    @State private var showStats = false

    private var activeHabits: [Habit] { habits.filter(\.isActive) }
    private var habitLookup: [String: [String: String]] { HabitActions.lookup(entries) }
    private var dayMeals: [MealLog] { meals.filter { $0.day == day } }
    private var dayWeight: WeightSample? { weights.first { $0.day == day } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Palette.Space.section) {
                    if prefs.habits, !activeHabits.isEmpty {
                        VStack(spacing: 12) {
                            ForEach(activeHabits, id: \.key) { habit in
                                HabitCard(
                                    label: habit.label,
                                    key: habit.key,
                                    value: HabitActions.value(entries: entries, key: habit.key, day: day),
                                    lookup: habitLookup[habit.key] ?? [:],
                                    selected: day,
                                    onChange: { stamp, next in
                                        HabitActions.set(context: context, entries: entries, key: habit.key, day: stamp, value: next)
                                        sync.pushQuietly(context: context)
                                    },
                                    onSelectDay: { day = $0 }
                                )
                            }
                        }
                    }

                    if prefs.activity {
                        if health.access != .authorized {
                            AccessBanner(access: health.access, action: handleAccess)
                        } else if Calendar.current.isDateInToday(DayStamp.date(from: day) ?? .now) {
                            DayStrip(
                                calories: health.snapshot.activeCalories,
                                exercise: health.snapshot.exerciseMinutes,
                                stand: health.snapshot.standHours
                            )
                        }
                    }

                    if prefs.weight {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                SectionLabel(text: "Weight")
                                Text(dayWeight.map { "\(Formatters.oneDecimal($0.kg)) kg" } ?? "Not logged")
                                    .font(.system(size: 22, weight: .semibold, design: .rounded))
                                    .foregroundStyle(dayWeight == nil ? Palette.muted : Palette.ink)
                            }
                            Spacer()
                            if day == DayStamp.today() {
                                Button(dayWeight == nil ? "Log" : "Logged") { logWeightNow() }
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Palette.onAccent)
                                    .padding(.horizontal, 16)
                                    .frame(minHeight: 40)
                                    .background(Palette.accent, in: Capsule())
                                    .buttonStyle(PressScaleStyle(enabled: dayWeight == nil))
                                    .disabled(dayWeight != nil)
                                    .opacity(dayWeight == nil ? 1 : 0.45)
                            }
                        }
                        .cardSurface()
                    }

                    if prefs.workouts || prefs.food {
                        HStack(spacing: 10) {
                            if prefs.workouts {
                                Button("Log workout") { loggingWorkout = true }
                                    .buttonStyle(BlockButtonStyle(filled: true))
                            }
                            if prefs.food {
                                Button("Log meal") { loggingMeal = true }
                                    .buttonStyle(BlockButtonStyle(filled: false))
                            }
                        }
                    }

                    if prefs.food, !dayMeals.isEmpty {
                        GroupedCard(title: "Food") {
                            ForEach(Array(dayMeals.enumerated()), id: \.element.id) { index, meal in
                                Button { editingMeal = meal } label: {
                                    HStack {
                                        Text(meal.name)
                                        Spacer()
                                        Text("\(meal.calories) kcal")
                                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                                            .monospacedDigit()
                                    }
                                    .foregroundStyle(Palette.ink)
                                    .padding(.horizontal, Palette.Space.cardPad)
                                    .padding(.vertical, 12)
                                }
                                .buttonStyle(PressScaleStyle())
                                if index < dayMeals.count - 1 { ListRowDivider() }
                            }
                        }
                    }

                    if prefs.workouts, let mine = logged.first {
                        Button { editingWorkout = mine } label: {
                            LoggedWorkoutRow(workout: mine)
                                .padding(.horizontal, Palette.Space.cardPad)
                        }
                        .buttonStyle(PressScaleStyle())
                        .groupedFill()
                    }
                }
                .padding(Palette.Space.screen)
            }
            .refreshable {
                await health.refresh()
                await sync.refresh(context: context)
            }
            .modifier(Screen())
            .navigationTitle(DayStamp.pretty(day))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showSettings = true } label: { Image(systemName: "gearshape") }
                        .accessibilityLabel("Settings")
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button { showStats = true } label: { Image(systemName: "chart.bar.fill") }
                        .accessibilityLabel("Stats")
                    Menu {
                        if prefs.workouts {
                            Button("Log workout") { loggingWorkout = true }
                        }
                        if prefs.food {
                            Button("Log meal") { loggingMeal = true }
                        }
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Palette.onAccent)
                            .frame(width: 32, height: 32)
                            .background(Palette.accent, in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Add")
                }
            }
            .sheet(isPresented: $showSettings) { TrackingSettingsView() }
            .sheet(isPresented: $showStats) {
                HabitStatsView(habits: activeHabits, lookup: habitLookup)
            }
            .sheet(isPresented: $loggingWorkout) { LogWorkoutSheet() }
            .sheet(isPresented: $loggingMeal) { LogMealSheet() }
            .sheet(item: $editingWorkout) { LogWorkoutSheet(workout: $0) }
            .sheet(item: $editingMeal) { LogMealSheet(meal: $0) }
            .sensoryFeedback(.success, trigger: weightPulse)
        }
    }

    private func handleAccess() {
        if health.access == .denied, let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
            return
        }
        Task { await health.requestAccess() }
    }

    private func logWeightNow() {
        let kg = health.snapshot.weightKg ?? weights.first?.kg
        if WeightLog.saveToday(context: context, weights: weights, kg: kg, sync: sync) {
            weightPulse += 1
        }
    }
}
