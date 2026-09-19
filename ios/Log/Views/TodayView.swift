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
    @State private var loggingWorkout = false
    @State private var loggingMeal = false
    @State private var editingWorkout: LoggedWorkout?
    @State private var editingMeal: MealLog?
    @State private var weightPulse = 0
    @State private var showSettings = false

    private var day: String { DayStamp.today() }
    private var activeHabits: [Habit] { habits.filter(\.isActive) }
    private var todaysMeals: [MealLog] { meals.filter { $0.day == day } }
    private var todayWeight: WeightSample? { weights.first { $0.day == day } }
    private var recentLoggedDays: [String] {
        let today = day
        return Array(
            Set(entries.map(\.day))
                .filter { $0 != today }
                .sorted(by: >)
                .prefix(5)
        )
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Palette.Space.section) {
                    if prefs.activity {
                        activitySection
                    }

                    if prefs.habits {
                        habitsSection
                    }

                    if prefs.weight {
                        weightSection
                    }

                    logActions

                    if prefs.food, !todaysMeals.isEmpty {
                        mealsSection
                    }

                    if prefs.workouts {
                        workoutSection
                    }

                    if prefs.habits, !recentLoggedDays.isEmpty {
                        HabitHistorySection(
                            habits: activeHabits,
                            entries: entries,
                            days: recentLoggedDays,
                            context: context
                        )
                    }
                }
                .padding(Palette.Space.screen)
                .padding(.bottom, 12)
            }
            .refreshable {
                await health.refresh()
                await sync.refresh(context: context)
            }
            .modifier(Screen())
            .navigationTitle("Today")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Settings")
                }
            }
            .sheet(isPresented: $showSettings) { TrackingSettingsView() }
            .sheet(isPresented: $loggingWorkout) { LogWorkoutSheet() }
            .sheet(isPresented: $loggingMeal) { LogMealSheet() }
            .sheet(item: $editingWorkout) { workout in
                LogWorkoutSheet(workout: workout)
            }
            .sheet(item: $editingMeal) { meal in
                LogMealSheet(meal: meal)
            }
            .sensoryFeedback(.success, trigger: weightPulse)
        }
    }

    @ViewBuilder
    private var activitySection: some View {
        if health.access != .authorized {
            AccessBanner(access: health.access, action: handleAccess)
        } else {
            VStack(alignment: .leading, spacing: 12) {
                DayStrip(
                    calories: health.snapshot.activeCalories,
                    exercise: health.snapshot.exerciseMinutes,
                    stand: health.snapshot.standHours
                )
                HStack(alignment: .top, spacing: 10) {
                    QuietStat(label: "Steps", value: Formatters.int(health.snapshot.steps), unit: "")
                    QuietStat(label: "Sleep", value: Formatters.oneDecimal(health.snapshot.sleepHours), unit: "hr")
                }
            }
        }
    }

    private var habitsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "Today’s habits")
            VStack(spacing: 0) {
                ForEach(Array(activeHabits.enumerated()), id: \.element.key) { index, habit in
                    let current = HabitActions.value(entries: entries, key: habit.key, day: day)
                    HStack(spacing: 12) {
                        Text(habit.label)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Palette.ink)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .multilineTextAlignment(.leading)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                HabitActions.set(
                                    context: context,
                                    entries: entries,
                                    key: habit.key,
                                    day: day,
                                    value: current == nil ? "yes" : nil
                                )
                                sync.pushQuietly(context: context)
                            }
                        TickControl(value: current) { next in
                            HabitActions.set(
                                context: context,
                                entries: entries,
                                key: habit.key,
                                day: day,
                                value: next
                            )
                            sync.pushQuietly(context: context)
                        }
                    }
                    .padding(.horizontal, Palette.Space.cardPad)
                    .padding(.vertical, 6)
                    .contextMenu {
                        Button("Done") {
                            HabitActions.set(context: context, entries: entries, key: habit.key, day: day, value: "yes")
                            sync.pushQuietly(context: context)
                        }
                        Button("Half") {
                            HabitActions.set(context: context, entries: entries, key: habit.key, day: day, value: "partial")
                            sync.pushQuietly(context: context)
                        }
                        Button("Clear", role: .destructive) {
                            HabitActions.set(context: context, entries: entries, key: habit.key, day: day, value: nil)
                            sync.pushQuietly(context: context)
                        }
                    }

                    if index < activeHabits.count - 1 {
                        ListRowDivider()
                    }
                }
            }
            .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous)
                    .stroke(Palette.line, lineWidth: 1)
            )
        }
    }

    private var weightSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "Weight")
            HStack(alignment: .center, spacing: 16) {
                if let todayWeight {
                    Text("\(Formatters.oneDecimal(todayWeight.kg)) kg")
                        .font(.system(size: 28, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Palette.ink)
                        .contentTransition(.numericText())
                } else {
                    Text("Not logged yet")
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.muted)
                }
                Spacer(minLength: 8)
                Button(todayWeight == nil ? "Log" : "Logged") {
                    logWeightNow()
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color.white)
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .frame(minHeight: 44)
                .background(Palette.accent, in: Capsule())
                .buttonStyle(PressScaleStyle(enabled: todayWeight == nil))
                .disabled(todayWeight != nil)
                .opacity(todayWeight == nil ? 1 : 0.5)
            }
            .cardSurface()
        }
    }

    @ViewBuilder
    private var logActions: some View {
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
    }

    private var mealsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "Food")
            VStack(alignment: .leading, spacing: 10) {
                Text("\(todaysMeals.reduce(0) { $0 + $1.calories }) kcal  ·  \(todaysMeals.reduce(0) { $0 + $1.proteinG })g protein")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                ForEach(todaysMeals, id: \.id) { meal in
                    Button { editingMeal = meal } label: {
                        Text("\(meal.name)  \(meal.calories) kcal")
                            .font(.system(size: 14))
                            .foregroundStyle(Palette.muted)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(PressScaleStyle())
                }
            }
            .cardSurface()
        }
    }

    @ViewBuilder
    private var workoutSection: some View {
        if let mine = logged.first {
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel(text: "Last session")
                Button { editingWorkout = mine } label: {
                    LoggedWorkoutRow(workout: mine)
                        .padding(.horizontal, Palette.Space.cardPad)
                }
                .buttonStyle(PressScaleStyle())
                .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous)
                        .stroke(Palette.line, lineWidth: 1)
                )
            }
        } else if let watch = health.snapshot.workouts.first {
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel(text: "From Watch")
                WatchWorkoutRow(workout: watch)
                    .padding(.horizontal, Palette.Space.cardPad)
                    .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous)
                            .stroke(Palette.line, lineWidth: 1)
                    )
            }
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

struct BlockButtonStyle: ButtonStyle {
    var filled = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .frame(maxWidth: .infinity)
            .frame(minHeight: 48)
            .padding(.vertical, 2)
            .foregroundStyle(filled ? Color.white : Palette.ink)
            .background(
                filled ? Palette.accent : Palette.surface,
                in: RoundedRectangle(cornerRadius: Palette.Radius.control, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Palette.Radius.control, style: .continuous)
                    .stroke(Palette.lineStrong, lineWidth: filled ? 0 : 1)
            )
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .opacity(configuration.isPressed ? 0.92 : 1)
            .animation(.easeOut(duration: 0.14), value: configuration.isPressed)
    }
}
