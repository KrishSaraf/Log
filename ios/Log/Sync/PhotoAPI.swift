import Foundation

enum PhotoAPI {
    static let analyzeTimeout: TimeInterval = 60

    struct FoodItem {
        var name: String
        var calories: Int
        var proteinG: Int
        var carbsG: Int
        var fatG: Int
    }

    struct MealDraft {
        var mealName: String
        var mealType: String
        var calories: Int
        var proteinG: Int
        var carbsG: Int?
        var fatG: Int?
        var foodNames: [String]
        var foods: [FoodItem]
    }

    struct WorkoutExercise {
        var name: String
        var reps: Int
        var weightKg: Double

        var line: String {
            if reps > 0 && weightKg > 0 {
                return "\(name)  \(reps) × \(Formatters.oneDecimal(weightKg)) kg"
            }
            if reps > 0 { return "\(name)  \(reps) reps" }
            return name
        }
    }

    struct WorkoutDraft {
        var name: String
        var exercises: [WorkoutExercise]
    }

    enum AnalyzeError: Error {
        case unreadable
    }

    static func analyzeMealPhoto(_ jpeg: Data, hint: String? = nil) async throws -> MealDraft {
        do {
            let data = try await APIClient.analyzeFoodPhoto(jpeg: jpeg, hint: hint)
            return try parseMeal(from: data)
        } catch {
            throw AnalyzeError.unreadable
        }
    }

    static func analyzeWorkout(_ jpeg: Data, hint: String? = nil) async throws -> WorkoutDraft {
        do {
            let data = try await APIClient.analyzeWorkoutPhoto(jpeg: jpeg, hint: hint)
            return try parseWorkout(from: data)
        } catch {
            throw AnalyzeError.unreadable
        }
    }

    static func analyzeWorkoutPhoto(jpeg: Data, hint: String? = nil) async throws -> Data {
        try await APIClient.analyzeWorkoutPhoto(jpeg: jpeg, hint: hint)
    }

    private static func parseMeal(from data: Data) throws -> MealDraft {
        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw AnalyzeError.unreadable
        }
        let draft = (root["draft"] as? [String: Any]) ?? root
        let rawFoods = (draft["foods"] as? [[String: Any]]) ?? []

        var items: [FoodItem] = []
        var calories = 0
        var protein = 0
        var carbs = 0
        var fat = 0

        for food in rawFoods {
            let item = FoodItem(
                name: string(food["name"]) ?? "Food",
                calories: intValue(food["calories"]),
                proteinG: intValue(food["proteinG"] ?? food["protein"]),
                carbsG: intValue(food["carbsG"] ?? food["carbs"]),
                fatG: intValue(food["fatG"] ?? food["fat"])
            )
            items.append(item)
            calories += item.calories
            protein += item.proteinG
            carbs += item.carbsG
            fat += item.fatG
        }

        if items.isEmpty {
            calories = intValue(draft["calories"])
            protein = intValue(draft["proteinG"] ?? draft["protein"])
            carbs = intValue(draft["carbsG"] ?? draft["carbs"])
            fat = intValue(draft["fatG"] ?? draft["fat"])
        }

        let names = items.map(\.name).filter { !$0.isEmpty }
        let mealName = string(draft["mealName"]) ?? names.first ?? ""
        let mealType = string(draft["mealType"]) ?? ""

        if mealName.isEmpty && names.isEmpty && calories == 0 && protein == 0 {
            throw AnalyzeError.unreadable
        }

        return MealDraft(
            mealName: mealName,
            mealType: mealType.capitalized,
            calories: calories,
            proteinG: protein,
            carbsG: carbs,
            fatG: fat,
            foodNames: names,
            foods: items
        )
    }

    private static func parseWorkout(from data: Data) throws -> WorkoutDraft {
        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw AnalyzeError.unreadable
        }
        let draft = (root["draft"] as? [String: Any]) ?? root
        let raw = (draft["exercises"] as? [[String: Any]]) ?? []
        var exercises: [WorkoutExercise] = []
        for exercise in raw {
            guard let name = string(exercise["name"]) else { continue }
            let sets = (exercise["sets"] as? [[String: Any]]) ?? []
            let first = sets.first
            exercises.append(
                WorkoutExercise(
                    name: name,
                    reps: intValue(first?["reps"]),
                    weightKg: doubleValue(first?["weightKg"] ?? first?["weight"])
                )
            )
        }
        if exercises.isEmpty, let name = string(draft["name"]) {
            exercises.append(WorkoutExercise(name: name, reps: 0, weightKg: 0))
        }
        let title = string(draft["name"]) ?? exercises.first?.name ?? ""
        if title.isEmpty && exercises.isEmpty { throw AnalyzeError.unreadable }
        return WorkoutDraft(name: title.isEmpty ? "Session" : title, exercises: exercises)
    }

    private static func string(_ value: Any?) -> String? {
        guard let value else { return nil }
        if let text = value as? String {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }
        return nil
    }

    private static func intValue(_ value: Any?) -> Int {
        if let number = value as? Int { return number }
        if let number = value as? Double { return Int(number.rounded()) }
        if let number = value as? NSNumber { return Int(number.doubleValue.rounded()) }
        if let text = value as? String, let number = Double(text) { return Int(number.rounded()) }
        return 0
    }

    private static func doubleValue(_ value: Any?) -> Double {
        if let number = value as? Double { return number }
        if let number = value as? Int { return Double(number) }
        if let number = value as? NSNumber { return number.doubleValue }
        if let text = value as? String, let number = Double(text) { return number }
        return 0
    }
}
