import SwiftUI
import UIKit

enum Palette {
    /// Warm night, closer to Productive than cold charcoal.
    static let bg = Color.adaptive(
        light: UIColor(red: 0.965, green: 0.953, blue: 0.933, alpha: 1),
        dark: UIColor(red: 0.055, green: 0.055, blue: 0.07, alpha: 1)
    )
    static let surface = Color.adaptive(
        light: UIColor.white,
        dark: UIColor(red: 0.11, green: 0.11, blue: 0.14, alpha: 1)
    )
    static let ink = Color.adaptive(
        light: UIColor(red: 0.122, green: 0.118, blue: 0.110, alpha: 1),
        dark: UIColor(red: 0.957, green: 0.945, blue: 0.918, alpha: 1)
    )
    static let muted = Color.adaptive(
        light: UIColor(red: 0.45, green: 0.43, blue: 0.40, alpha: 1),
        dark: UIColor(red: 0.62, green: 0.60, blue: 0.55, alpha: 1)
    )
    static let faint = Color.adaptive(
        light: UIColor(red: 0.72, green: 0.70, blue: 0.66, alpha: 1),
        dark: UIColor(red: 0.38, green: 0.37, blue: 0.34, alpha: 1)
    )
    static let line = Color.adaptive(
        light: UIColor(white: 0, alpha: 0.07),
        dark: UIColor(white: 1, alpha: 0.08)
    )
    static let lineStrong = Color.adaptive(
        light: UIColor(white: 0, alpha: 0.12),
        dark: UIColor(white: 1, alpha: 0.14)
    )

    /// Lavender, matching the habit-card chrome.
    static let accent = Color.adaptive(
        light: UIColor(red: 0.48, green: 0.42, blue: 0.98, alpha: 1),
        dark: UIColor(red: 0.55, green: 0.49, blue: 1.00, alpha: 1)
    )
    static let onAccent = Color.white
    static let rust = accent

    static let move = Color(red: 0.91, green: 0.36, blue: 0.30)
    static let exercise = Color(red: 0.45, green: 0.78, blue: 0.48)
    static let stand = Color(red: 0.40, green: 0.74, blue: 0.86)

    static let title = Font.system(.title3, design: .default).weight(.semibold)

    enum Radius {
        static let card: CGFloat = 22
        static let cardInner: CGFloat = 14
        static let control: CGFloat = 16
        static let chip: CGFloat = 12
        static let hero: CGFloat = 22
    }

    enum Space {
        static let screen: CGFloat = 20
        static let section: CGFloat = 22
        static let cardPad: CGFloat = 16
        static let row: CGFloat = 12
    }
}

extension Color {
    static func adaptive(light: UIColor, dark: UIColor) -> Color {
        Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? dark : light })
    }
}

struct PressScaleStyle: ButtonStyle {
    var enabled = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(enabled && configuration.isPressed ? 0.96 : 1)
            .opacity(enabled && configuration.isPressed ? 0.92 : 1)
            .animation(.easeOut(duration: 0.14), value: configuration.isPressed)
    }
}

struct CardSurface: ViewModifier {
    var padding: CGFloat = Palette.Space.cardPad

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
    }
}

extension View {
    func cardSurface(padding: CGFloat = Palette.Space.cardPad) -> some View {
        modifier(CardSurface(padding: padding))
    }

    func groupedFill() -> some View {
        background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
    }
}
