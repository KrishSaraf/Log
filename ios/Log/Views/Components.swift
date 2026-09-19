import SwiftUI

struct Screen: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(Palette.bg.ignoresSafeArea())
    }
}

struct MetricTile: View {
    let label: String
    let value: String
    let unit: String
    var tint: Color = Palette.text

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold, design: .default))
                .tracking(0.8)
                .foregroundStyle(Palette.muted)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 28, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(tint)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                if !unit.isEmpty && value != "—" {
                    Text(unit)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Palette.muted)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
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
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(Palette.muted)
                .fixedSize(horizontal: false, vertical: true)

            if showsButton {
                Button(action: action) {
                    Text(buttonTitle)
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Palette.accent, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .foregroundStyle(.black)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Palette.line, lineWidth: 1)
        )
    }

    private var title: String {
        switch access {
        case .unavailable: return "Health isn’t available here"
        case .denied: return "Health access is off"
        default: return "Connect Apple Watch"
        }
    }

    private var message: String {
        switch access {
        case .unavailable:
            return "Open Log on your iPhone, paired with your Apple Watch."
        case .denied:
            return "Turn on the categories you want in Settings → Health → Data Access & Devices → Log."
        default:
            return "Allow Log to read activity, workouts, sleep, and heart rate."
        }
    }

    private var buttonTitle: String {
        access == .denied ? "Open Settings" : "Continue"
    }

    private var showsButton: Bool {
        access == .needed || access == .unknown || access == .denied
    }
}

struct EmptyPanel: View {
    let title: String
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Palette.text)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(Palette.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Palette.line, lineWidth: 1)
        )
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
        let minutes = Int(seconds / 60)
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
