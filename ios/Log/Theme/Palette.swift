import SwiftUI

enum Palette {
    static let bg = Color(red: 0.071, green: 0.067, blue: 0.059)
    static let surface = Color(red: 0.110, green: 0.106, blue: 0.094)
    static let ink = Color(red: 0.910, green: 0.878, blue: 0.831)
    static let muted = Color(red: 0.557, green: 0.525, blue: 0.478)
    static let rust = Color(red: 0.769, green: 0.361, blue: 0.149)
    static let line = Color(red: 0.165, green: 0.157, blue: 0.141)
    static let move = Color(red: 0.91, green: 0.36, blue: 0.30)
    static let exercise = Color(red: 0.45, green: 0.78, blue: 0.48)
    static let stand = Color(red: 0.40, green: 0.74, blue: 0.86)

    static let display = Font.system(.largeTitle, design: .serif).weight(.semibold)
    static let title = Font.system(.title3, design: .serif).weight(.semibold)
    static let number = Font.system(size: 34, weight: .semibold, design: .rounded)
}
