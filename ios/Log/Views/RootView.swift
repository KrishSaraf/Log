import SwiftUI
import SwiftData

struct RootView: View {
    @Environment(HealthKitService.self) private var health
    @Environment(\.modelContext) private var context
    @Environment(\.scenePhase) private var scenePhase
    @State private var sync = SyncEngine()

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
        .environment(sync)
        .task {
            AppSeed.runIfNeeded(context: context)
            await health.prepare()
            await sync.refresh(context: context)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                Task { await sync.refresh(context: context) }
            }
        }
    }
}
