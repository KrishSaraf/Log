import SwiftUI
import SwiftData

struct HabitHistorySection: View {
    @Environment(SyncEngine.self) private var sync
    let habits: [Habit]
    let entries: [HabitEntry]
    let days: [String]
    let context: ModelContext
    var title: String = "Recent days"

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: title)
            VStack(spacing: 0) {
                ForEach(Array(days.enumerated()), id: \.element) { index, day in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(DayStamp.pretty(day))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Palette.ink)

                        ForEach(habits, id: \.key) { habit in
                            HStack {
                                Text(habit.label)
                                    .font(.system(size: 15, weight: .medium))
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
                    .padding(.horizontal, Palette.Space.cardPad)
                    .padding(.vertical, 12)

                    if index < days.count - 1 {
                        ListRowDivider()
                    }
                }
            }
            .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous)
                    .stroke(Palette.line, lineWidth: 1)
            )
        }
    }
}
