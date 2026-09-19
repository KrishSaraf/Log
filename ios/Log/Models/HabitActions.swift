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
                existing.needsPush = true
                existing.updatedAt = .now
            } else {
                context.insert(SyncTombstone(kind: "habit", key: key, day: day))
                context.delete(existing)
            }
        } else if let value {
            context.insert(HabitEntry(key: key, day: day, value: value, needsPush: true))
        }
        try? context.save()
    }

    static func value(entries: [HabitEntry], key: String, day: String) -> String? {
        entries.first(where: { $0.key == key && $0.day == day })?.value
    }
}
