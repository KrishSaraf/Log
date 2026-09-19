import SwiftUI
import UIKit

enum Palette {
    static let bg = Color.adaptive(
        light: UIColor(red: 0.95, green: 0.95, blue: 0.97, alpha: 1),
        dark: UIColor(red: 0.055, green: 0.055, blue: 0.058, alpha: 1)
    )
    static let surface = Color.adaptive(
        light: UIColor.white,
        dark: UIColor(red: 0.098, green: 0.098, blue: 0.102, alpha: 1)
    )
    static let surfaceRaised = Color.adaptive(
        light: UIColor(red: 0.99, green: 0.99, blue: 1, alpha: 1),
        dark: UIColor(red: 0.125, green: 0.125, blue: 0.130, alpha: 1)
    )
    static let ink = Color.adaptive(
        light: UIColor(red: 0.11, green: 0.11, blue: 0.12, alpha: 1),
        dark: UIColor(red: 0.96, green: 0.96, blue: 0.97, alpha: 1)
    )
    static let muted = Color.adaptive(
        light: UIColor(red: 0.42, green: 0.42, blue: 0.45, alpha: 1),
        dark: UIColor(red: 0.56, green: 0.56, blue: 0.58, alpha: 1)
    )
    static let faint = Color.adaptive(
        light: UIColor(red: 0.68, green: 0.68, blue: 0.70, alpha: 1),
        dark: UIColor(red: 0.38, green: 0.38, blue: 0.40, alpha: 1)
    )
    static let line = Color.adaptive(
        light: UIColor(white: 0, alpha: 0.08),
        dark: UIColor(white: 1, alpha: 0.08)
    )
    static let lineStrong = Color.adaptive(
        light: UIColor(white: 0, alpha: 0.12),
        dark: UIColor(white: 1, alpha: 0.12)
    )

    /// System blue in both appearances.
    static let accent = Color.adaptive(
        light: UIColor(red: 0 / 255, green: 122 / 255, blue: 255 / 255, alpha: 1),
        dark: UIColor(red: 10 / 255, green: 132 / 255, blue: 255 / 255, alpha: 1)
    )
    /// Alias so existing `Palette.rust` call sites keep compiling.
    static let rust = accent

    static let move = Color(red: 0.91, green: 0.36, blue: 0.30)
    static let exercise = Color(red: 0.45, green: 0.78, blue: 0.48)
    static let stand = Color(red: 0.40, green: 0.74, blue: 0.86)

    static let display = Font.system(.largeTitle, design: .default).weight(.bold)
    static let title = Font.system(.title3, design: .default).weight(.semibold)
    static let number = Font.system(size: 34, weight: .semibold, design: .rounded)

    /// Continuous-corner radii (outer = inner + padding).
    enum Radius {
        static let card: CGFloat = 20
        static let cardInner: CGFloat = 12
        static let control: CGFloat = 14
        static let chip: CGFloat = 10
        static let hero: CGFloat = 22
    }

    enum Space {
        static let screen: CGFloat = 20
        static let section: CGFloat = 28
        static let cardPad: CGFloat = 16
        static let row: CGFloat = 14
    }
}

extension Color {
    static func adaptive(light: UIColor, dark: UIColor) -> Color {
        Color(
            uiColor: UIColor { traits in
                traits.userInterfaceStyle == .dark ? dark : light
            }
        )
    }
}

/// Scale-to-0.96 press — interruptible, restrained (feel-better skill).
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
    var radius: CGFloat = Palette.Radius.card

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(Palette.line, lineWidth: 1)
            )
    }
}

extension View {
    func cardSurface(
        padding: CGFloat = Palette.Space.cardPad,
        radius: CGFloat = Palette.Radius.card
    ) -> some View {
        modifier(CardSurface(padding: padding, radius: radius))
    }

    func screenChrome() -> some View {
        modifier(Screen())
    }
}
