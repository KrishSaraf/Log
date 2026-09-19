import SwiftUI

@main
struct LogApp: App {
    @State private var health = HealthKitService()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(health)
                .preferredColorScheme(.dark)
        }
    }
}
