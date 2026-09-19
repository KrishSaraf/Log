import Foundation
import SwiftData

enum AppSeed {
    private static let flag = "log.seeded.v1"

    static func runIfNeeded(context: ModelContext) {
        guard !UserDefaults.standard.bool(forKey: flag) else { return }

        if let habits = load("habits", as: HabitFile.self) {
            for question in habits.questions {
                context.insert(
                    Habit(
                        key: question.key,
                        label: question.label,
                        isActive: question.isActive,
                        orderIndex: question.orderIndex
                    )
                )
            }
            for row in habits.responses {
                let value = normalize(row.value, numeric: row.numeric)
                guard let value else { continue }
                context.insert(HabitEntry(key: row.key, day: row.date, value: value, needsPush: false))
            }
        }

        if let weights = load("weights", as: [WeightRow].self) {
            for row in weights {
                context.insert(WeightSample(day: row.date, kg: row.kg, needsPush: false))
            }
        }

        if let sessions = load("workouts", as: [SessionRow].self) {
            for row in sessions {
                let date = parse(row.date) ?? .now
                let workout = LoggedWorkout(
                    name: row.name ?? "Session",
                    date: date,
                    notes: row.notes ?? "",
                    needsPush: false
                )
                context.insert(workout)
            }
        }

        try? context.save()
        UserDefaults.standard.set(true, forKey: flag)
    }

    private static func normalize(_ value: String?, numeric: Double?) -> String? {
        if let value {
            let v = value.lowercased()
            if v == "no" || v == "x" { return "no" }
            if v == "partial" || v == "1/2" || v == "half" { return "partial" }
            if !v.isEmpty { return "yes" }
        }
        if let numeric {
            if numeric == 0 { return "no" }
            if numeric == 0.5 { return "partial" }
            if numeric > 0 { return "yes" }
        }
        return nil
    }

    private static func parse(_ day: String) -> Date? {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: String(day.prefix(10)))
    }

    private static func load<T: Decodable>(_ name: String, as type: T.Type) -> T? {
        guard let url = bundleJSON(name), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    static func bundleJSON(_ name: String) -> URL? {
        Bundle.main.url(forResource: name, withExtension: "json")
            ?? Bundle.main.url(forResource: name, withExtension: "json", subdirectory: "Resources")
    }
}

private struct HabitFile: Decodable {
    let questions: [HabitQuestionRow]
    let responses: [HabitResponseRow]
}

private struct HabitQuestionRow: Decodable {
    let key: String
    let label: String
    let isActive: Bool
    let orderIndex: Int
}

private struct HabitResponseRow: Decodable {
    let key: String
    let date: String
    let value: String?
    let numeric: Double?

    enum CodingKeys: String, CodingKey { case key, date, value, numeric }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        key = try c.decode(String.self, forKey: .key)
        date = String((try c.decode(String.self, forKey: .date)).prefix(10))
        value = try c.decodeIfPresent(String.self, forKey: .value)
        if let n = try? c.decodeIfPresent(Double.self, forKey: .numeric) {
            numeric = n
        } else if let s = try? c.decodeIfPresent(String.self, forKey: .numeric), let n = Double(s) {
            numeric = n
        } else {
            numeric = nil
        }
    }
}

private struct WeightRow: Decodable {
    let date: String
    let kg: Double
}

private struct SessionRow: Decodable {
    let date: String
    let name: String?
    let notes: String?
}

struct CatalogExercise: Decodable, Identifiable {
    let id: String
    let name: String
    let bodyPart: String
    let equipment: String
    let target: String
    let level: String

    static func all() -> [CatalogExercise] {
        guard let url = AppSeed.bundleJSON("exercises"),
              let data = try? Data(contentsOf: url),
              let rows = try? JSONDecoder().decode([CatalogExercise].self, from: data)
        else { return [] }
        return rows
    }
}
