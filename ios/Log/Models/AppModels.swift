import Foundation
import SwiftData

@Model
final class Habit {
    var key: String
    var label: String
    var isActive: Bool
    var orderIndex: Int
    var remoteId: String? = nil

    init(key: String, label: String, isActive: Bool, orderIndex: Int, remoteId: String? = nil) {
        self.key = key
        self.label = label
        self.isActive = isActive
        self.orderIndex = orderIndex
        self.remoteId = remoteId
    }
}

@Model
final class HabitEntry {
    var key: String
    var day: String
    var value: String
    var needsPush: Bool = false
    var updatedAt: Date = Date()

    init(key: String, day: String, value: String, needsPush: Bool = true) {
        self.key = key
        self.day = day
        self.value = value
        self.needsPush = needsPush
        self.updatedAt = .now
    }
}

@Model
final class WeightSample {
    var day: String
    var kg: Double
    var needsPush: Bool = false
    var updatedAt: Date = Date()

    init(day: String, kg: Double, needsPush: Bool = true) {
        self.day = day
        self.kg = kg
        self.needsPush = needsPush
        self.updatedAt = .now
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
    var carbsG: Int = 0
    var fatG: Int = 0
    var createdAt: Date
    var remoteId: String? = nil
    var needsPush: Bool = false
    var updatedAt: Date = Date()

    init(
        id: UUID = UUID(),
        day: String,
        name: String,
        mealType: String,
        calories: Int,
        proteinG: Int,
        carbsG: Int = 0,
        fatG: Int = 0,
        remoteId: String? = nil,
        needsPush: Bool = true
    ) {
        self.id = id
        self.day = day
        self.name = name
        self.mealType = mealType
        self.calories = calories
        self.proteinG = proteinG
        self.carbsG = carbsG
        self.fatG = fatG
        self.createdAt = .now
        self.remoteId = remoteId
        self.needsPush = needsPush
        self.updatedAt = .now
    }
}

@Model
final class SyncTombstone {
    var kind: String
    var remoteId: String
    var key: String
    var day: String
    var createdAt: Date

    init(kind: String, remoteId: String = "", key: String = "", day: String = "") {
        self.kind = kind
        self.remoteId = remoteId
        self.key = key
        self.day = day
        self.createdAt = .now
    }
}

enum DayStamp {
    static func today() -> String {
        from(Date())
    }

    static func from(_ date: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar.current
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = Calendar.current.timeZone
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    static func date(from day: String) -> Date? {
        let f = DateFormatter()
        f.calendar = Calendar.current
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = Calendar.current.timeZone
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: String(day.prefix(10)))
    }

    static func pretty(_ day: String) -> String {
        guard let date = date(from: day) else { return day }
        if Calendar.current.isDateInToday(date) { return "Today" }
        if Calendar.current.isDateInYesterday(date) { return "Yesterday" }
        return date.formatted(.dateTime.month(.abbreviated).day().year())
    }

    static func recentDays(_ count: Int) -> [String] {
        (0..<count).compactMap { offset in
            guard let date = Calendar.current.date(byAdding: .day, value: -offset, to: Date()) else { return nil }
            return from(date)
        }
    }
}
