import SwiftUI
import SwiftData

struct HabitTiles: View {
    let tint: Color
    let lookup: [String: String]
    let selected: String
    let weeks: Int
    let onTap: (String) -> Void

    private let tile: CGFloat = 9
    private let gap: CGFloat = 3

    private var columns: [[String]] { Self.columns(weeks: weeks) }
    private var today: String { DayStamp.today() }
    private var width: CGFloat { CGFloat(weeks) * tile + CGFloat(max(weeks - 1, 0)) * gap }
    private var height: CGFloat { tile * 7 + gap * 6 }

    var body: some View {
        Canvas { context, _ in
            for (weekIndex, week) in columns.enumerated() {
                for (dayIndex, stamp) in week.enumerated() {
                    let x = CGFloat(weekIndex) * (tile + gap)
                    let y = CGFloat(dayIndex) * (tile + gap)
                    let rect = CGRect(x: x, y: y, width: tile, height: tile)
                    let path = Path(roundedRect: rect, cornerRadius: 2)
                    context.fill(path, with: .color(fill(for: stamp)))
                    if stamp == selected {
                        context.stroke(path, with: .color(Palette.ink.opacity(0.55)), lineWidth: 1)
                    }
                }
            }
        }
        .frame(width: width, height: height)
        .contentShape(Rectangle())
        .gesture(
            SpatialTapGesture().onEnded { event in
                let stride = tile + gap
                let week = Int(event.location.x / stride)
                let day = Int(event.location.y / stride)
                guard columns.indices.contains(week), columns[week].indices.contains(day) else { return }
                let stamp = columns[week][day]
                guard stamp <= today else { return }
                onTap(stamp)
            }
        )
        .accessibilityHidden(true)
    }

    private func fill(for stamp: String) -> Color {
        if stamp > today { return Palette.line.opacity(0.45) }
        let value = lookup[stamp]
        if value == "partial" { return tint.opacity(0.45) }
        if HabitActions.isFilled(value) { return tint }
        return Palette.faint.opacity(0.35)
    }

    static func columns(weeks: Int, ending: Date = Date()) -> [[String]] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: ending)
        let weekday = cal.component(.weekday, from: today)
        let daysFromMonday = (weekday + 5) % 7
        guard let thisMonday = cal.date(byAdding: .day, value: -daysFromMonday, to: today) else { return [] }
        guard let firstMonday = cal.date(byAdding: .weekOfYear, value: -(weeks - 1), to: thisMonday) else { return [] }
        return (0..<weeks).map { week in
            (0..<7).compactMap { day in
                guard let date = cal.date(byAdding: .day, value: week * 7 + day, to: firstMonday) else { return nil }
                return DayStamp.from(date)
            }
        }
    }

    static func weeks(fitting width: CGFloat) -> Int {
        let stride: CGFloat = 9 + 3
        return min(24, max(14, Int((width + 3) / stride)))
    }
}

struct HabitCard: View {
    let label: String
    let key: String
    let value: String?
    let lookup: [String: String]
    let selected: String
    let onChange: (String, String?) -> Void
    let onSelectDay: (String) -> Void

    private var tint: Color { HabitColor.ink(for: key) }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(tint.opacity(0.16))
                    Image(systemName: HabitColor.symbol(for: key))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(tint)
                }
                .frame(width: 40, height: 40)

                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Palette.ink)
                        .lineLimit(1)
                    Text(HabitColor.blurb(for: key))
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.muted)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                TickControl(value: value, tint: tint) { next in
                    onChange(selected, next)
                }
            }

            GeometryReader { geo in
                HabitTiles(
                    tint: tint,
                    lookup: lookup,
                    selected: selected,
                    weeks: HabitTiles.weeks(fitting: geo.size.width),
                    onTap: handleTile
                )
            }
            .frame(height: 9 * 7 + 3 * 6)
        }
        .padding(16)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
        .contextMenu {
            Button("Done") { onChange(selected, "yes") }
            Button("Half") { onChange(selected, "partial") }
            Button("Clear", role: .destructive) { onChange(selected, nil) }
        }
    }

    private func handleTile(_ stamp: String) {
        onSelectDay(stamp)
        onChange(stamp, HabitActions.toggle(lookup[stamp]))
    }
}

struct HabitStatsView: View {
    let habits: [Habit]
    let lookup: [String: [String: String]]
    @Environment(\.dismiss) private var dismiss

    private var maps: [[String: String]] { habits.map { lookup[$0.key] ?? [:] } }
    private var merged: [String: String] { HabitActions.mergedDays(maps) }
    private var done: Int { maps.reduce(0) { $0 + HabitActions.completions($1) } }
    private var rate: Double { HabitActions.completionRate(lookups: maps, habitCount: max(habits.count, 1), until: DayStamp.today()) }
    private var best: Int { maps.map(HabitActions.longestStreak).max() ?? 0 }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(String(Calendar.current.component(.year, from: Date())))
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(Palette.ink)
                        GeometryReader { geo in
                            HabitTiles(
                                tint: Palette.accent,
                                lookup: merged,
                                selected: "",
                                weeks: HabitTiles.weeks(fitting: geo.size.width),
                                onTap: { _ in }
                            )
                        }
                        .frame(height: 9 * 7 + 3 * 6)
                    }
                    .padding(16)
                    .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))

                    HStack(spacing: 12) {
                        QuietStat(label: "Completions", value: Formatters.int(Double(done)), unit: "")
                        QuietStat(label: "Rate", value: "\(Int((rate * 100).rounded()))", unit: "%")
                    }

                    HStack(spacing: 12) {
                        QuietStat(label: "Best Streak", value: "\(best)", unit: "")
                        QuietStat(label: "Habits", value: "\(habits.count)", unit: "")
                    }
                }
                .padding(Palette.Space.screen)
            }
            .modifier(Screen())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.onAccent)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(Palette.accent, in: Capsule())
                }
            }
        }
    }
}
