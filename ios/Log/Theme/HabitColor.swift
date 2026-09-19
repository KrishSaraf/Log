import SwiftUI

enum HabitColor {
    static func ink(for key: String) -> Color {
        Color(hex: hex(for: key))
    }

    static func hex(for key: String) -> String {
        switch key {
        case "gym": return "7B8CFF"
        case "cardio_sport": return "FF8A3D"
        case "diet": return "4ADE80"
        case "protein": return "F4B942"
        case "morning_skincare": return "F472B6"
        case "night_clean": return "FB7185"
        case "brush": return "22D3EE"
        case "m": return "C084FC"
        case "doc_rehab": return "F07167"
        case "multivitamin": return "A3E635"
        default:
            let palette = ["7B8CFF", "FF8A3D", "F472B6", "22D3EE", "C084FC", "F4B942", "4ADE80", "FB7185"]
            let sum = key.unicodeScalars.reduce(0) { $0 + Int($1.value) }
            return palette[sum % palette.count]
        }
    }

    static func symbol(for key: String) -> String {
        switch key {
        case "gym": return "dumbbell.fill"
        case "cardio_sport": return "figure.run"
        case "diet": return "leaf.fill"
        case "protein": return "fork.knife"
        case "morning_skincare": return "sun.max.fill"
        case "night_clean": return "moon.fill"
        case "brush": return "mouth.fill"
        case "m": return "book.fill"
        case "doc_rehab": return "cross.case.fill"
        case "multivitamin": return "pills.fill"
        default: return "circle.fill"
        }
    }

    static func blurb(for key: String) -> String {
        switch key {
        case "gym": return "Weightlifting, running or similar"
        case "cardio_sport": return "A run, tennis, or any sport"
        case "diet": return "Eat the way you meant to"
        case "protein": return "Hit the day’s protein"
        case "morning_skincare": return "Morning skin care"
        case "night_clean": return "Wash up before bed"
        case "brush": return "Brush your teeth"
        case "m": return "Whatever this is for you"
        case "doc_rehab": return "The rehab work"
        case "multivitamin": return "Take it"
        default: return "Mark the day you do it"
        }
    }
}

extension Color {
    init(hex: String) {
        let raw = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: raw).scanHexInt64(&int)
        let r, g, b: Double
        switch raw.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 0.5; g = 0.5; b = 0.5
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }
}
