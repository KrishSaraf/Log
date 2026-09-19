import SwiftUI
import SwiftData

struct RootView: View {
    @Environment(HealthKitService.self) private var health
    @Environment(\.modelContext) private var context
    @Environment(\.scenePhase) private var scenePhase
    @State private var sync = SyncEngine()
    @State private var loggingPreferences = LoggingPreferences()

    var body: some View {
        TabView {
            TodayView()
                .tabItem {
                    Label("Today", systemImage: "sun.max")
                }

            if loggingPreferences.workouts {
                WorkoutsView()
                    .tabItem {
                        Label("Workouts", systemImage: "figure.strengthtraining.traditional")
                    }
            }

            if loggingPreferences.food {
                NutritionView()
                    .tabItem {
                        Label("Food", systemImage: "fork.knife")
                    }
            }

            HealthView()
                .tabItem {
                    Label("Health", systemImage: "heart")
                }
        }
        .tint(Palette.accent)
        .toolbarBackground(Palette.bg.opacity(0.94), for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .environment(sync)
        .environment(loggingPreferences)
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
