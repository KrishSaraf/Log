import SwiftData

enum HabitActions {
    static func set(
        context: ModelContext,
        entries: [HabitEntry],
        key: String,
        day: String,
        value: String?
    ) {
        if let existing = entries.first(where: { $0.key == key && $0.day == day }) {
            if let value {
                existing.value = value
            } else {
                context.delete(existing)
            }
        } else if let value {
            context.insert(HabitEntry(key: key, day: day, value: value))
        }
    }

    static func value(entries: [HabitEntry], key: String, day: String) -> String? {
        entries.first(where: { $0.key == key && $0.day == day })?.value
    }
}
