import SwiftUI

struct Screen: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(Palette.bg.ignoresSafeArea())
    }
}

struct SectionLabel: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(Palette.muted)
            .accessibilityAddTraits(.isHeader)
    }
}

struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(Palette.accent, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .foregroundStyle(Palette.onAccent)
        }
        .buttonStyle(PressScaleStyle())
    }
}

struct BlockButtonStyle: ButtonStyle {
    var filled = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(filled ? Palette.onAccent : Palette.ink)
            .background(
                filled ? Palette.accent : Palette.surface,
                in: Capsule()
            )
            .overlay(Capsule().stroke(filled ? Color.clear : Palette.lineStrong, lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeOut(duration: 0.14), value: configuration.isPressed)
    }
}

struct WeekStrip: View {
    @Binding var selected: String

    private var days: [(stamp: String, date: Date)] {
        (0..<7).compactMap { offset in
            guard let date = Calendar.current.date(byAdding: .day, value: offset - 6, to: Date()) else { return nil }
            return (DayStamp.from(date), date)
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(days, id: \.stamp) { item in
                let on = item.stamp == selected
                Button {
                    selected = item.stamp
                } label: {
                    VStack(spacing: 6) {
                        Text(item.date.formatted(.dateTime.weekday(.narrow)))
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(on ? Palette.ink : Palette.muted)
                        Text(item.date.formatted(.dateTime.day()))
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(on ? Palette.ink : Palette.muted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(on ? Palette.surface : Color.clear, in: Capsule())
                }
                .buttonStyle(PressScaleStyle())
                .accessibilityLabel(item.date.formatted(.dateTime.weekday(.wide).month(.abbreviated).day()))
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
        .padding(4)
        .background(Palette.bg)
    }
}

struct GroupedCard<Content: View>: View {
    var title: String? = nil
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let title { SectionLabel(text: title) }
            VStack(spacing: 0) { content }
                .groupedFill()
        }
    }
}

struct DayStrip: View {
    let calories: Double?
    let exercise: Double?
    let stand: Double?
    var moveGoal: Double = 500
    var exerciseGoal: Double = 30
    var standGoal: Double = 12
    @State private var appeared = false

    var body: some View {
        HStack(alignment: .center, spacing: 18) {
            ActivityRings(
                move: appeared ? ratio(calories, moveGoal) : 0,
                exercise: appeared ? ratio(exercise, exerciseGoal) : 0,
                stand: appeared ? ratio(stand, standGoal) : 0
            )
            .frame(width: 96, height: 96)
            .animation(.easeOut(duration: 0.8), value: appeared)

            VStack(alignment: .leading, spacing: 10) {
                legend("Move", Formatters.int(calories), "kcal", Palette.move)
                legend("Exercise", Formatters.int(exercise), "min", Palette.exercise)
                legend("Stand", Formatters.oneDecimal(stand), "hr", Palette.stand)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .cardSurface()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Move \(Formatters.int(calories)) kilocalories, Exercise \(Formatters.int(exercise)) minutes, Stand \(Formatters.oneDecimal(stand)) hours")
        .onAppear { appeared = true }
    }

    private func ratio(_ value: Double?, _ goal: Double) -> Double {
        guard let value, goal > 0 else { return 0 }
        return min(max(value / goal, 0), 1)
    }

    private func legend(_ title: String, _ value: String, _ unit: String, _ tint: Color) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Palette.muted)
                .frame(width: 64, alignment: .leading)
            Text(value)
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(tint)
            if value != "—" {
                Text(unit).font(.system(size: 12)).foregroundStyle(Palette.muted)
            }
        }
    }
}

struct QuietStat: View {
    let label: String
    let value: String
    let unit: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Palette.muted)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value)
                    .font(.system(size: 22, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                if value != "—" {
                    Text(unit).font(.system(size: 12)).foregroundStyle(Palette.muted)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface()
    }
}

struct AccessBanner: View {
    let access: HealthAccess
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(Palette.title).foregroundStyle(Palette.ink)
            Text(message).font(.system(size: 15)).foregroundStyle(Palette.muted)
            if access == .needed || access == .unknown || access == .denied {
                PrimaryButton(title: access == .denied ? "Open Settings" : "Continue", action: action)
            }
        }
        .cardSurface()
    }

    private var title: String {
        switch access {
        case .unavailable: return "Open this on your iPhone"
        case .denied: return "Health access is off"
        default: return "Show today’s Watch numbers"
        }
    }

    private var message: String {
        switch access {
        case .unavailable: return "Log needs the iPhone that is paired with your Watch."
        case .denied: return "Turn on the categories you want in Settings → Health → Data Access & Devices → Log."
        default: return "Allow activity, workouts, sleep, and heart rate."
        }
    }
}

struct ListRowDivider: View {
    var body: some View {
        Rectangle().fill(Palette.line).frame(height: 1).padding(.leading, Palette.Space.cardPad)
    }
}

enum Formatters {
    static func int(_ value: Double?) -> String {
        guard let value else { return "—" }
        return value.formatted(.number.precision(.fractionLength(0)))
    }

    static func oneDecimal(_ value: Double?) -> String {
        guard let value else { return "—" }
        return value.formatted(.number.precision(.fractionLength(0...1)))
    }

    static func duration(_ seconds: TimeInterval) -> String {
        let minutes = Int((seconds / 60).rounded())
        if minutes < 60 { return "\(minutes) min" }
        let hours = minutes / 60
        let rem = minutes % 60
        return rem == 0 ? "\(hours)h" : "\(hours)h \(rem)m"
    }

    static func time(_ date: Date) -> String {
        date.formatted(date: .omitted, time: .shortened)
    }

    static func day(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) { return "Today" }
        if Calendar.current.isDateInYesterday(date) { return "Yesterday" }
        return date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
    }
}
