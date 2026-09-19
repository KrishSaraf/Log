import Foundation

struct SyncSnapshot {
    var questions: [RemoteQuestion]
    var responses: [RemoteHabitTick]
    var workouts: [RemoteWorkout]
    var meals: [RemoteMeal]
    var weights: [RemoteWeight]

    static func decode(from data: Data) throws -> SyncSnapshot {
        let root = try JSONSerialization.jsonObject(with: data)
        guard let object = root as? [String: Any] else {
            throw APIError.unreachable
        }
        return SyncSnapshot(object: object)
    }

    init(
        questions: [RemoteQuestion] = [],
        responses: [RemoteHabitTick] = [],
        workouts: [RemoteWorkout] = [],
        meals: [RemoteMeal] = [],
        weights: [RemoteWeight] = []
    ) {
        self.questions = questions
        self.responses = responses
        self.workouts = workouts
        self.meals = meals
        self.weights = weights
    }

    init(object: [String: Any]) {
        let habits = object["habits"] as? [String: Any]
        let questionRows =
            object.array("questions")
            ?? habits?.array("questions")
            ?? []
        questions = questionRows.compactMap(RemoteQuestion.init)

        let keyByQuestionId = Dictionary(
            uniqueKeysWithValues: questions.compactMap { question in
                question.id.map { ($0, question.key) }
            }
        )

        let responseRows =
            object.array("responses")
            ?? object.array("habitEntries")
            ?? object.array("ticks")
            ?? habits?.array("responses")
            ?? []
        responses = responseRows.compactMap { RemoteHabitTick($0, keyByQuestionId: keyByQuestionId) }

        let workoutRows = object.array("workouts") ?? object.array("sessions") ?? []
        workouts = workoutRows.compactMap(RemoteWorkout.init)

        var meals = (object.array("meals") ?? []).compactMap(RemoteMeal.init)
        if let foods = object.array("food_entries") ?? object.array("foodEntries") {
            meals = RemoteMeal.merge(meals: meals, foods: foods)
        }
        self.meals = meals

        if let rows = object.array("weights") {
            weights = rows.compactMap(RemoteWeight.init)
        } else {
            let metrics = object.array("health_metrics") ?? object.array("healthMetrics") ?? []
            weights = metrics.compactMap(RemoteWeight.init)
        }
    }
}

struct RemoteQuestion {
    var id: String?
    var key: String
    var label: String
    var isActive: Bool
    var orderIndex: Int

    init?(_ raw: [String: Any]) {
        guard let key = raw.string("key"), !key.isEmpty else { return nil }
        self.id = raw.string("id")
        self.key = key
        self.label = raw.string("label") ?? key
        self.isActive = raw.bool("isActive") ?? raw.bool("is_active") ?? true
        self.orderIndex = raw.int("orderIndex") ?? raw.int("order_index") ?? 0
    }
}

struct RemoteHabitTick {
    var key: String
    var day: String
    var value: String

    init?(_ raw: [String: Any], keyByQuestionId: [String: String]) {
        let key =
            raw.string("key")
            ?? raw.string("questionKey")
            ?? raw.string("question_key")
            ?? raw.string("questionId").flatMap { keyByQuestionId[$0] }
            ?? raw.string("question_id").flatMap { keyByQuestionId[$0] }
        guard let key, let day = raw.day else { return nil }
        let value = tickValue(raw)
        guard let value else { return nil }
        self.key = key
        self.day = day
        self.value = value
    }
}

struct RemoteWorkout {
    var id: String?
    var name: String
    var day: String
    var notes: String
    var exercises: [RemoteExercise]

    init?(_ raw: [String: Any]) {
        guard let day = raw.day else { return nil }
        self.id = raw.string("id") ?? raw.string("workoutId")
        self.name = raw.string("name")?.nilIfEmpty ?? "Session"
        self.day = day
        self.notes = raw.string("notes") ?? ""
        self.exercises = (raw.array("exercises") ?? []).compactMap(RemoteExercise.init)
    }
}

struct RemoteExercise {
    var name: String
    var orderIndex: Int
    var sets: [RemoteSet]

    init?(_ raw: [String: Any]) {
        let name =
            raw.string("customName")
            ?? raw.string("custom_name")
            ?? raw.string("name")
            ?? ""
        guard !name.isEmpty else { return nil }
        self.name = name
        self.orderIndex = raw.int("orderIndex") ?? raw.int("order_index") ?? 0
        self.sets = (raw.array("sets") ?? []).enumerated().compactMap { index, row in
            RemoteSet(row, fallbackIndex: index)
        }
    }
}

struct RemoteSet {
    var setIndex: Int
    var reps: Int
    var weightKg: Double

    init?(_ raw: [String: Any], fallbackIndex: Int) {
        let reps = raw.int("reps") ?? 0
        let kg = raw.double("weightKg") ?? raw.double("weight_kg") ?? 0
        guard reps > 0 || kg > 0 else { return nil }
        self.setIndex = raw.int("setIndex") ?? raw.int("set_index") ?? fallbackIndex
        self.reps = reps
        self.weightKg = kg
    }
}

struct RemoteMeal {
    var id: String?
    var day: String
    var name: String
    var mealType: String
    var calories: Int
    var proteinG: Int

    init?(_ raw: [String: Any]) {
        guard let day = raw.day else { return nil }
        let foods = raw.array("foods") ?? raw.array("foodEntries") ?? raw.array("food_entries") ?? []
        let calories =
            raw.int("calories")
            ?? foods.reduce(0) { $0 + (RemoteMeal.foodCalories($1)) }
        let protein =
            raw.int("proteinG")
            ?? raw.int("protein_g")
            ?? foods.reduce(0) { $0 + (RemoteMeal.foodProtein($1)) }
        self.id = raw.string("id") ?? raw.string("mealId")
        self.day = day
        self.name = raw.string("name") ?? raw.string("mealName") ?? raw.string("meal_name") ?? "Meal"
        self.mealType = (raw.string("mealType") ?? raw.string("meal_type") ?? "snack").capitalized
        self.calories = calories
        self.proteinG = protein
    }

    static func merge(meals: [RemoteMeal], foods: [[String: Any]]) -> [RemoteMeal] {
        var byId: [String: (meal: RemoteMeal, cal: Int, pro: Int)] = [:]
        for meal in meals {
            if let id = meal.id {
                byId[id] = (meal, meal.calories, meal.proteinG)
            }
        }
        for food in foods {
            guard let mealId = food.string("mealId") ?? food.string("meal_id") else { continue }
            let addCal = foodCalories(food)
            let addPro = foodProtein(food)
            if var existing = byId[mealId] {
                existing.cal += addCal
                existing.pro += addPro
                byId[mealId] = existing
            }
        }
        return meals.map { meal in
            guard let id = meal.id, let bundled = byId[id] else { return meal }
            var copy = meal
            if copy.calories == 0 { copy.calories = bundled.cal }
            if copy.proteinG == 0 { copy.proteinG = bundled.pro }
            return copy
        }
    }

    private static func foodCalories(_ raw: [String: Any]) -> Int {
        raw.int("calories") ?? Int((raw.double("calories") ?? 0).rounded())
    }

    private static func foodProtein(_ raw: [String: Any]) -> Int {
        raw.int("proteinG") ?? raw.int("protein_g") ?? Int((raw.double("proteinG") ?? raw.double("protein_g") ?? 0).rounded())
    }
}

struct RemoteWeight {
    var day: String
    var kg: Double

    init?(_ raw: [String: Any]) {
        guard let day = raw.day else { return nil }
        let metric = (raw.string("metric") ?? "weight_kg").lowercased()
        if metric.contains("weight") == false && raw["kg"] == nil && raw["weightKg"] == nil {
            return nil
        }
        let kg = raw.double("kg") ?? raw.double("weightKg") ?? raw.double("weight_kg") ?? raw.double("value")
        guard let kg, kg > 0 else { return nil }
        self.day = day
        self.kg = kg
    }
}

private func tickValue(_ raw: [String: Any]) -> String? {
    if let text = raw.string("value") ?? raw.string("valueText") ?? raw.string("value_text") {
        let v = text.lowercased()
        if v == "no" || v == "x" { return "no" }
        if v == "partial" || v == "1/2" || v == "half" { return "partial" }
        if !v.isEmpty { return "yes" }
    }
    if let flag = raw.bool("valueBool") ?? raw.bool("value_bool") {
        return flag ? "yes" : "no"
    }
    if let n = raw.double("valueNumeric") ?? raw.double("value_numeric") ?? raw.double("numeric") {
        if n == 0 { return "no" }
        if n == 0.5 { return "partial" }
        if n > 0 { return "yes" }
    }
    return nil
}

private extension String {
    var nilIfEmpty: String? {
        let t = trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }
}

private extension Dictionary where Key == String, Value == Any {
    func string(_ key: String) -> String? {
        if let value = self[key] as? String { return value.nilIfEmpty }
        if let value = self[key] as? NSNumber { return value.stringValue }
        return nil
    }

    func bool(_ key: String) -> Bool? {
        if let value = self[key] as? Bool { return value }
        if let value = self[key] as? NSNumber { return value.boolValue }
        if let value = string(key)?.lowercased() {
            if value == "true" || value == "1" { return true }
            if value == "false" || value == "0" { return false }
        }
        return nil
    }

    func int(_ key: String) -> Int? {
        if let value = self[key] as? Int { return value }
        if let value = self[key] as? NSNumber { return value.intValue }
        if let value = string(key), let n = Int(value) { return n }
        if let value = double(key) { return Int(value.rounded()) }
        return nil
    }

    func double(_ key: String) -> Double? {
        if let value = self[key] as? Double { return value }
        if let value = self[key] as? Int { return Double(value) }
        if let value = self[key] as? NSNumber { return value.doubleValue }
        if let value = self[key] as? String, let n = Double(value) { return n }
        return nil
    }

    func array(_ key: String) -> [[String: Any]]? {
        self[key] as? [[String: Any]]
    }

    var day: String? {
        let raw = string("date") ?? string("day") ?? string("recordedAt") ?? string("recorded_at")
        guard let raw else { return nil }
        return String(raw.prefix(10))
    }
}
