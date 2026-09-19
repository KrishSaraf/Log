import SwiftUI
import SwiftData

struct RootView: View {
    @Environment(HealthKitService.self) private var health
    @Environment(\.modelContext) private var context

    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "sun.max") }
            WorkoutsView()
                .tabItem { Label("Workouts", systemImage: "figure.strengthtraining.traditional") }
            NutritionView()
                .tabItem { Label("Food", systemImage: "fork.knife") }
            HealthView()
                .tabItem { Label("Health", systemImage: "heart") }
            JournalView()
                .tabItem { Label("Log", systemImage: "checkmark.rectangle") }
        }
        .tint(Palette.rust)
        .task {
            AppSeed.runIfNeeded(context: context)
            await health.prepare()
        }
    }
}
