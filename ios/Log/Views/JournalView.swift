import SwiftUI

struct JournalView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Daily questions")
                        .font(Palette.title)
                        .foregroundStyle(Palette.ink)
                    Text("Energy, mood, and the rest of your check-in will live here next.")
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.muted)
                }
                .padding(20)
            }
            .modifier(Screen())
            .navigationTitle("Log")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}
