import SwiftUI
import SwiftData

struct JournalView: View {
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync
    @Query(sort: \Habit.orderIndex) private var habits: [Habit]
    @Query private var entries: [HabitEntry]

    private var day: String { DayStamp.today() }
    private var historyDays: [String] {
        Array(Set(entries.map(\.day)).filter { $0 != day }.sorted(by: >).prefix(21))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Mark the day. Blank means you have not logged it.")
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.muted)

                    ForEach(habits, id: \.key) { habit in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(habit.label)
                                    .font(.system(size: 17, weight: .semibold, design: .serif))
                                    .foregroundStyle(Palette.ink)
                                if !habit.isActive {
                                    Text("Earlier")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(Palette.muted)
                                }
                                Spacer()
                                Text(stat(habit.key))
                                    .font(.system(size: 12))
                                    .foregroundStyle(Palette.muted)
                            }
                            TickControl(
                                value: HabitActions.value(entries: entries, key: habit.key, day: day)
                            ) { next in
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
                        .padding(.vertical, 8)
                        .overlay(alignment: .bottom) {
                            Rectangle().fill(Palette.line).frame(height: 1)
                        }
                    }

                    if !historyDays.isEmpty {
                        HabitHistorySection(
                            habits: habits,
                            entries: entries,
                            days: historyDays,
                            context: context
                        )
                    }

                    WebsiteSettingsCard()
                        .padding(.top, 8)
                }
                .padding(20)
            }
            .refreshable { await sync.refresh(context: context) }
            .modifier(Screen())
            .navigationTitle("Log")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    private func stat(_ key: String) -> String {
        let mine = entries.filter { $0.key == key }
        let done = mine.filter { $0.value == "yes" || $0.value == "partial" }.count
        return mine.isEmpty ? "No days yet" : "\(done) of \(mine.count)"
    }
}
