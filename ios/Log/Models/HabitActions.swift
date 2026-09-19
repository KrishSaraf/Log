import Foundation
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

    static func lookup(_ entries: [HabitEntry]) -> [String: [String: String]] {
        var map: [String: [String: String]] = [:]
        map.reserveCapacity(16)
        for entry in entries {
            map[entry.key, default: [:]][entry.day] = entry.value
        }
        return map
    }

    static func isFilled(_ value: String?) -> Bool {
        guard let value else { return false }
        return value != "no"
    }

    static func toggle(_ value: String?) -> String? {
        isFilled(value) ? nil : "yes"
    }

    static func completions(_ lookup: [String: String]) -> Int {
        lookup.values.filter { isFilled($0) }.count
    }

    static func longestStreak(_ lookup: [String: String]) -> Int {
        let days = lookup.keys.filter { isFilled(lookup[$0]) }.sorted()
        var best = 0
        var run = 0
        var previous: String?
        for day in days {
            if let previous, DayStamp.shift(previous, by: 1) == day {
                run += 1
            } else {
                run = 1
            }
            best = max(best, run)
            previous = day
        }
        return best
    }

    static func completionRate(lookups: [[String: String]], habitCount: Int, until day: String) -> Double {
        guard habitCount > 0 else { return 0 }
        let stamps = lookups.flatMap(\.keys)
        guard let first = stamps.min(), let start = DayStamp.date(from: first), let end = DayStamp.date(from: day) else { return 0 }
        let days = max(1, Calendar.current.dateComponents([.day], from: start, to: end).day ?? 0) + 1
        let done = lookups.reduce(0) { $0 + completions($1) }
        return Double(done) / Double(days * habitCount)
    }

    static func mergedDays(_ lookups: [[String: String]]) -> [String: String] {
        var counts: [String: Int] = [:]
        for map in lookups {
            for (day, value) in map where isFilled(value) {
                counts[day, default: 0] += 1
            }
        }
        return counts.mapValues { $0 >= 3 ? "yes" : "partial" }
    }

    static func streak(lookup: [String: String], from day: String) -> Int {
        var cursor = day
        if !isFilled(lookup[cursor]) {
            guard let previous = DayStamp.shift(day, by: -1) else { return 0 }
            cursor = previous
        }
        var count = 0
        while isFilled(lookup[cursor]) {
            count += 1
            guard let previous = DayStamp.shift(cursor, by: -1) else { break }
            cursor = previous
        }
        return count
    }
}
