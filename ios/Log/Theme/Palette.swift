import SwiftUI
import UIKit

enum Palette {
    /// Charcoal surfaces, shared with the web dashboard.
    static let bg = Color.adaptive(
        light: UIColor(red: 0.965, green: 0.965, blue: 0.960, alpha: 1),
        dark: UIColor(red: 0.039, green: 0.039, blue: 0.043, alpha: 1) // #0a0a0b
    )
    static let surface = Color.adaptive(
        light: UIColor.white,
        dark: UIColor(red: 0.063, green: 0.063, blue: 0.071, alpha: 1) // #101012
    )
    static let ink = Color.adaptive(
        light: UIColor(red: 0.10, green: 0.10, blue: 0.11, alpha: 1),
        dark: UIColor(red: 0.929, green: 0.929, blue: 0.937, alpha: 1) // #ededef
    )
    static let muted = Color.adaptive(
        light: UIColor(red: 0.45, green: 0.45, blue: 0.48, alpha: 1),
        dark: UIColor(red: 0.604, green: 0.604, blue: 0.639, alpha: 1) // #9a9aa3
    )
    static let faint = Color.adaptive(
        light: UIColor(red: 0.70, green: 0.70, blue: 0.72, alpha: 1),
        dark: UIColor(red: 0.396, green: 0.396, blue: 0.431, alpha: 1) // #65656e
    )
    static let line = Color.adaptive(
        light: UIColor(white: 0, alpha: 0.07),
        dark: UIColor(white: 1, alpha: 0.08)
    )
    static let lineStrong = Color.adaptive(
        light: UIColor(white: 0, alpha: 0.12),
        dark: UIColor(white: 1, alpha: 0.14)
    )

    /// Electric lime — shared with web (`#c6f135`).
    static let accent = Color(red: 0.776, green: 0.945, blue: 0.208) // #c6f135
    static let onAccent = Color(red: 0.039, green: 0.047, blue: 0.031) // #0a0c08
    static let rust = accent

    static let move = accent
    static let exercise = Color(red: 0.561, green: 0.820, blue: 0.310) // #8fd14f
    static let stand = Color(red: 0.431, green: 0.784, blue: 0.878) // #6ec8e0

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
