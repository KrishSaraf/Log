import SwiftUI
import SwiftData

@main
struct LogApp: App {
    @State private var health = HealthKitService()
    @State private var appearance = AppearancePreference()

    init() {
        URLCache.shared = URLCache(
            memoryCapacity: 80 * 1024 * 1024,
            diskCapacity: 400 * 1024 * 1024
        )
        PhotoMemory.images.countLimit = 220
        PhotoMemory.images.totalCostLimit = 60 * 1024 * 1024
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(health)
                .environment(appearance)
                .preferredColorScheme(appearance.preferredScheme)
                .tint(Palette.accent)
        }
        .modelContainer(for: [
            LoggedWorkout.self,
            LoggedExercise.self,
            LoggedSet.self,
            Habit.self,
            HabitEntry.self,
            WeightSample.self,
            MealLog.self,
            SyncTombstone.self,
        ])
    }
}
