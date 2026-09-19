import SwiftUI
import SwiftData

@main
struct LogApp: App {
    @State private var health = HealthKitService()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(health)
                .preferredColorScheme(.dark)
                .tint(Palette.rust)
        }
        .modelContainer(for: [
            LoggedWorkout.self,
            LoggedExercise.self,
            LoggedSet.self,
            Habit.self,
            HabitEntry.self,
            WeightSample.self,
            MealLog.self,
        ])
    }
}
