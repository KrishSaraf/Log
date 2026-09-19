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
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundStyle(Palette.muted)
            .padding(.bottom, 2)
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
                .background(Palette.accent, in: RoundedRectangle(cornerRadius: Palette.Radius.control, style: .continuous))
                .foregroundStyle(Color.white)
        }
        .buttonStyle(PressScaleStyle())
    }
}

struct HeroActionButton: View {
    let title: String
    let systemImage: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 10) {
                Image(systemName: systemImage)
                    .font(.system(size: 30, weight: .medium))
                    .symbolRenderingMode(.hierarchical)
                Text(title)
                    .font(.system(size: 17, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 28)
            .foregroundStyle(Color.white)
            .background(Palette.accent, in: RoundedRectangle(cornerRadius: Palette.Radius.hero, style: .continuous))
        }
        .buttonStyle(PressScaleStyle())
        .accessibilityLabel(title)
    }
}

struct SecondaryActionButton: View {
    let title: String
    var systemImage: String? = nil
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 14, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundStyle(Palette.ink)
            .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.control, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Palette.Radius.control, style: .continuous)
                    .stroke(Palette.lineStrong, lineWidth: 1)
            )
        }
        .buttonStyle(PressScaleStyle())
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
                move: appeared ? progress(calories, goal: moveGoal) : 0,
                exercise: appeared ? progress(exercise, goal: exerciseGoal) : 0,
                stand: appeared ? progress(stand, goal: standGoal) : 0
            )
            .frame(width: 104, height: 104)
            .animation(.easeOut(duration: 0.85), value: appeared)

            VStack(alignment: .leading, spacing: 12) {
                ringLegend(title: "Move", value: Formatters.int(calories), unit: "kcal", tint: Palette.move)
                ringLegend(title: "Exercise", value: Formatters.int(exercise), unit: "min", tint: Palette.exercise)
                ringLegend(title: "Stand", value: Formatters.oneDecimal(stand), unit: "hr", tint: Palette.stand)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .cardSurface()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityText)
        .onAppear { appeared = true }
    }

    private func progress(_ value: Double?, goal: Double) -> Double {
        guard let value, goal > 0 else { return 0 }
        return min(max(value / goal, 0), 1)
    }

    private func ringLegend(title: String, value: String, unit: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Palette.muted)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 22, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(tint)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                    .contentTransition(.numericText())
                if value != "—" {
                    Text(unit)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.muted)
                }
            }
        }
    }

    private var accessibilityText: String {
        "Move \(Formatters.int(calories)) kilocalories, Exercise \(Formatters.int(exercise)) minutes, Stand \(Formatters.oneDecimal(stand)) hours"
    }
}

struct QuietStat: View {
    let label: String
    let value: String
    let unit: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Palette.muted)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value)
                    .font(.system(size: 22, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                    .contentTransition(.numericText())
                if value != "—" {
                    Text(unit)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.muted)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Palette.Space.cardPad)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.cardInner + 4, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Palette.Radius.cardInner + 4, style: .continuous)
                .stroke(Palette.line, lineWidth: 1)
        )
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
                .fixedSize(horizontal: false, vertical: true)
            if showsButton {
                PrimaryButton(title: buttonTitle, action: action)
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

struct ListRowDivider: View {
    var body: some View {
        Rectangle()
            .fill(Palette.line)
            .frame(height: 1)
            .padding(.leading, Palette.Space.cardPad)
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
