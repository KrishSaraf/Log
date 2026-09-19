import SwiftUI
import SwiftData

struct HabitHistorySection: View {
    @Environment(SyncEngine.self) private var sync
    let habits: [Habit]
    let entries: [HabitEntry]
    let days: [String]
    let context: ModelContext
    var title: String = "RECENT DAYS"

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionLabel(text: title)
            ForEach(days, id: \.self) { day in
                VStack(alignment: .leading, spacing: 8) {
                    Text(DayStamp.pretty(day))
                        .font(.system(size: 15, weight: .semibold, design: .serif))
                        .foregroundStyle(Palette.ink)

                    ForEach(habits, id: \.key) { habit in
                        HStack {
                            Text(habit.label)
                                .font(.system(size: 15, design: .serif))
                                .foregroundStyle(Palette.ink)
                            Spacer()
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
                    }
                }
                .padding(.vertical, 8)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(Palette.line).frame(height: 1)
                }
            }
        }
    }
}
