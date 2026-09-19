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
            .font(.system(size: 12, weight: .semibold))
            .tracking(1.1)
            .foregroundStyle(Palette.muted)
    }
}

struct PrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .semibold, design: .serif))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Palette.rust, in: RoundedRectangle(cornerRadius: 4, style: .continuous))
                .foregroundStyle(Palette.ink)
        }
        .buttonStyle(.plain)
    }
}

struct DayStrip: View {
    let calories: Double?
    let exercise: Double?
    let stand: Double?

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            stripColumn(title: "Move", value: Formatters.int(calories), unit: "kcal", tint: Palette.move)
            divider
            stripColumn(title: "Exercise", value: Formatters.int(exercise), unit: "min", tint: Palette.exercise)
            divider
            stripColumn(title: "Stand", value: Formatters.oneDecimal(stand), unit: "hr", tint: Palette.stand)
        }
        .padding(.vertical, 18)
        .padding(.horizontal, 8)
        .background(Palette.surface)
        .overlay(Rectangle().stroke(Palette.line, lineWidth: 1))
    }

    private var divider: some View {
        Rectangle()
            .fill(Palette.line)
            .frame(width: 1, height: 54)
    }

    private func stripColumn(title: String, value: String, unit: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Palette.muted)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(Palette.number)
                    .monospacedDigit()
                    .foregroundStyle(tint)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                if value != "—" {
                    Text(unit)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.muted)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
    }
}

struct QuietStat: View {
    let label: String
    let value: String
    let unit: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Palette.muted)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value)
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                if value != "—" {
                    Text(unit)
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.muted)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct AccessBanner: View {
    let access: HealthAccess
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(Palette.title)
                .foregroundStyle(Palette.ink)
            Text(message)
                .font(.system(size: 15))
                .foregroundStyle(Palette.muted)
            if showsButton {
                PrimaryButton(title: buttonTitle, action: action)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.surface)
        .overlay(Rectangle().stroke(Palette.line, lineWidth: 1))
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
        case .unavailable:
            return "Log needs the iPhone that is paired with your Watch."
        case .denied:
            return "Turn on the categories you want in Settings → Health → Data Access & Devices → Log."
        default:
            return "Allow activity, workouts, sleep, and heart rate."
        }
    }

    private var buttonTitle: String {
        access == .denied ? "Open Settings" : "Continue"
    }

    private var showsButton: Bool {
        access == .needed || access == .unknown || access == .denied
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
