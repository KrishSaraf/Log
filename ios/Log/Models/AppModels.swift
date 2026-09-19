import Foundation
import SwiftData

@Model
final class Habit {
    var key: String
    var label: String
    var isActive: Bool
    var orderIndex: Int

    init(key: String, label: String, isActive: Bool, orderIndex: Int) {
        self.key = key
        self.label = label
        self.isActive = isActive
        self.orderIndex = orderIndex
    }
}

@Model
final class HabitEntry {
    var key: String
    var day: String
    var value: String

    init(key: String, day: String, value: String) {
        self.key = key
        self.day = day
        self.value = value
    }
}

@Model
final class WeightSample {
    var day: String
    var kg: Double

    init(day: String, kg: Double) {
        self.day = day
        self.kg = kg
    }
}

@Model
final class MealLog {
    var id: UUID
    var day: String
    var name: String
    var mealType: String
    var calories: Int
    var proteinG: Int
    var createdAt: Date

    init(day: String, name: String, mealType: String, calories: Int, proteinG: Int) {
        self.id = UUID()
        self.day = day
        self.name = name
        self.mealType = mealType
        self.calories = calories
        self.proteinG = proteinG
        self.createdAt = .now
    }
}

enum DayStamp {
    static func today() -> String {
        let f = DateFormatter()
        f.calendar = Calendar.current
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    static func pretty(_ day: String) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        guard let date = f.date(from: day) else { return day }
        if Calendar.current.isDateInToday(date) { return "Today" }
        if Calendar.current.isDateInYesterday(date) { return "Yesterday" }
        return date.formatted(.dateTime.month(.abbreviated).day().year())
    }
}
