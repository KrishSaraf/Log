import SwiftUI

struct RootView: View {
    @Environment(HealthKitService.self) private var health

    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "sun.max") }
            HealthView()
                .tabItem { Label("Health", systemImage: "heart") }
            WorkoutsView()
                .tabItem { Label("Workouts", systemImage: "figure.strengthtraining.traditional") }
            JournalView()
                .tabItem { Label("Log", systemImage: "text.alignleft") }
        }
        .tint(Palette.rust)
        .task {
            await health.prepare()
        }
    }
}
