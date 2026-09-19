import SwiftUI

struct JournalView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                EmptyPanel(
                    title: "Nothing logged today",
                    message: "Energy, mood, and the questions you track will live here."
                )
                .padding(16)
            }
            .modifier(Screen())
            .navigationTitle("Log")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}
