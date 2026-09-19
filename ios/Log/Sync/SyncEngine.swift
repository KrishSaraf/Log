import Foundation
import SwiftData

@MainActor
@Observable
final class SyncEngine {
    var isUpdating = false
    var lastSuccess: Date?
    var lastNotice: String?

    func refresh(context: ModelContext) async {
        guard !isUpdating else { return }
        isUpdating = true
        defer { isUpdating = false }

        do {
            await pushTombs(context: context)
            let snapshot = try await APIClient.snapshot()
            apply(snapshot, context: context)
            try context.save()
            await pushAll(context: context)
            lastSuccess = .now
            lastNotice = "Updated just now"
        } catch {
            let pushed = await pushAll(context: context)
            if pushed {
                lastSuccess = .now
                lastNotice = "Updated just now"
            } else {
                lastNotice = "Couldn't reach the website. Your log is still saved on this phone."
            }
        }
    }

    func pushQuietly(context: ModelContext) {
        Task { await pushAll(context: context) }
    }

    private func pushTombs(context: ModelContext) async {
        let tombs = (try? context.fetch(FetchDescriptor<SyncTombstone>())) ?? []
        for tomb in tombs {
            if await push(tombstone: tomb) {
                context.delete(tomb)
            }
        }
        try? context.save()
    }

    @discardableResult
    private func pushAll(context: ModelContext) async -> Bool {
        var any = false
        let tombs = (try? context.fetch(FetchDescriptor<SyncTombstone>())) ?? []
        for tomb in tombs {
            if await push(tombstone: tomb) {
                context.delete(tomb)
                any = true
            }
        }

        let workouts = (try? context.fetch(FetchDescriptor<LoggedWorkout>())) ?? []
        for workout in workouts where workout.needsPush {
            if await push(workout: workout) {
                workout.needsPush = false
                any = true
            }
        }

        let meals = (try? context.fetch(FetchDescriptor<MealLog>())) ?? []
        for meal in meals where meal.needsPush {
            if await push(meal: meal) {
                meal.needsPush = false
                any = true
            }
        }

        let ticks = (try? context.fetch(FetchDescriptor<HabitEntry>())) ?? []
        for tick in ticks where tick.needsPush {
            if await push(tick: tick) {
                tick.needsPush = false
                any = true
            }
        }

        let weights = (try? context.fetch(FetchDescriptor<WeightSample>())) ?? []
        for sample in weights where sample.needsPush {
            if await push(weight: sample) {
                sample.needsPush = false
                any = true
            }
        }

        try? context.save()
        return any
    }

    private func apply(_ snapshot: SyncSnapshot, context: ModelContext) {
        let habits = (try? context.fetch(FetchDescriptor<Habit>())) ?? []
        let ticks = (try? context.fetch(FetchDescriptor<HabitEntry>())) ?? []
        let workouts = (try? context.fetch(FetchDescriptor<LoggedWorkout>())) ?? []
        let meals = (try? context.fetch(FetchDescriptor<MealLog>())) ?? []
        let weights = (try? context.fetch(FetchDescriptor<WeightSample>())) ?? []
        let tombs = (try? context.fetch(FetchDescriptor<SyncTombstone>())) ?? []
        let deadMealIds = Set(tombs.filter { $0.kind == "meal" }.map(\.remoteId).filter { !$0.isEmpty })
        let deadMealKeys = Set(
            tombs.filter { $0.kind == "meal" }.map { "\($0.day.lowercased())|\($0.key.lowercased())" }
        )

        for remote in snapshot.questions {
            if let local = habits.first(where: { $0.key == remote.key }) {
                local.label = remote.label
                local.isActive = remote.isActive
                local.orderIndex = remote.orderIndex
                if local.remoteId == nil { local.remoteId = remote.id }
            } else {
                context.insert(
                    Habit(
                        key: remote.key,
                        label: remote.label,
                        isActive: remote.isActive,
                        orderIndex: remote.orderIndex,
                        remoteId: remote.id
                    )
                )
            }
        }

        for remote in snapshot.responses {
            if let local = ticks.first(where: { $0.key == remote.key && $0.day == remote.day }) {
                if local.needsPush { continue }
                local.value = remote.value
            } else {
                context.insert(HabitEntry(key: remote.key, day: remote.day, value: remote.value, needsPush: false))
            }
        }

        for remote in snapshot.workouts {
            if let local = matchWorkout(remote, in: workouts) {
                if local.remoteId == nil { local.remoteId = remote.id }
                if local.needsPush { continue }
                local.name = remote.name
                local.notes = remote.notes
                if let date = DayStamp.date(from: remote.day) { local.date = date }
                if !remote.exercises.isEmpty && local.exercises.isEmpty {
                    replaceExercises(on: local, with: remote.exercises, context: context)
                }
            } else {
                let workout = LoggedWorkout(
                    id: UUID(uuidString: remote.id ?? "") ?? UUID(),
                    name: remote.name,
                    date: DayStamp.date(from: remote.day) ?? .now,
                    notes: remote.notes,
                    remoteId: remote.id,
                    needsPush: false
                )
                replaceExercises(on: workout, with: remote.exercises, context: context)
                context.insert(workout)
            }
        }

        for remote in snapshot.meals {
            let stamp = "\(remote.day.lowercased())|\(remote.name.lowercased())"
            if deadMealIds.contains(remote.id ?? "") || deadMealKeys.contains(stamp) {
                continue
            }
            if let local = matchMeal(remote, in: meals) {
                if local.remoteId == nil { local.remoteId = remote.id }
                if local.needsPush { continue }
                local.name = remote.name
                local.mealType = remote.mealType
                local.day = remote.day
                local.calories = remote.calories
                local.proteinG = remote.proteinG
            } else {
                context.insert(
                    MealLog(
                        id: UUID(uuidString: remote.id ?? "") ?? UUID(),
                        day: remote.day,
                        name: remote.name,
                        mealType: remote.mealType,
                        calories: remote.calories,
                        proteinG: remote.proteinG,
                        remoteId: remote.id,
                        needsPush: false
                    )
                )
            }
        }

        for remote in snapshot.weights {
            if let local = weights.first(where: { $0.day == remote.day }) {
                if local.needsPush { continue }
                local.kg = remote.kg
            } else {
                context.insert(WeightSample(day: remote.day, kg: remote.kg, needsPush: false))
            }
        }
    }

    private func matchWorkout(_ remote: RemoteWorkout, in workouts: [LoggedWorkout]) -> LoggedWorkout? {
        if let id = remote.id {
            if let hit = workouts.first(where: { $0.remoteId == id }) { return hit }
            if let uuid = UUID(uuidString: id), let hit = workouts.first(where: { $0.id == uuid }) {
                return hit
            }
        }
        return workouts.first {
            $0.remoteId == nil && DayStamp.from($0.date) == remote.day && $0.name == remote.name
        }
    }

    private func matchMeal(_ remote: RemoteMeal, in meals: [MealLog]) -> MealLog? {
        if let id = remote.id {
            if let hit = meals.first(where: { $0.remoteId == id }) { return hit }
            if let uuid = UUID(uuidString: id), let hit = meals.first(where: { $0.id == uuid }) {
                return hit
            }
        }
        return meals.first {
            $0.remoteId == nil && $0.day == remote.day && $0.name == remote.name && $0.calories == remote.calories
        }
    }

    private func replaceExercises(on workout: LoggedWorkout, with remotes: [RemoteExercise], context: ModelContext) {
        for exercise in workout.exercises {
            context.delete(exercise)
        }
        workout.exercises = remotes.enumerated().map { index, remote in
            let exercise = LoggedExercise(name: remote.name, orderIndex: remote.orderIndex > 0 ? remote.orderIndex : index)
            exercise.sets = remote.sets.map { set in
                LoggedSet(setIndex: set.setIndex, reps: set.reps, weightKg: set.weightKg)
            }
            return exercise
        }
    }

    private func push(workout: LoggedWorkout) async -> Bool {
        let payload = workoutJSON(workout)
        let hasExercises = !(payload["exercises"] as? [[String: Any]] ?? []).isEmpty

        if let id = workout.remoteId, !id.isEmpty {
            if hasExercises {
                _ = await APIClient.sendFirstOK(method: "DELETE", paths: ["/api/workouts/\(id)"])
                if let result = await APIClient.sendFirstOK(
                    method: "POST",
                    paths: ["/api/workouts/save"],
                    json: payload
                ) {
                    workout.remoteId = APIClient.stringID(from: result, keys: ["workoutId", "id"]) ?? id
                    return true
                }
                return false
            }

            if let result = await APIClient.sendFirstOK(
                method: "PATCH",
                paths: ["/api/workouts/\(id)"],
                json: [
                    "name": workout.name,
                    "date": DayStamp.from(workout.date),
                    "notes": workout.notes,
                ]
            ) {
                workout.remoteId = APIClient.stringID(from: result, keys: ["workoutId", "id"]) ?? id
                return true
            }
            return false
        }

        guard hasExercises else { return false }

        if let result = await APIClient.sendFirstOK(
            method: "POST",
            paths: ["/api/workouts/save"],
            json: payload
        ) {
            workout.remoteId = APIClient.stringID(from: result, keys: ["workoutId", "id"]) ?? workout.remoteId
            return true
        }
        return false
    }

    private func push(meal: MealLog) async -> Bool {
        let payload = mealJSON(meal)
        if let id = meal.remoteId, !id.isEmpty {
            if await APIClient.sendFirstOK(
                method: "PATCH",
                paths: ["/api/nutrition/meals/\(id)", "/api/nutrition/save-meal", "/api/sync/meals/\(id)"],
                json: payload
            ) != nil {
                return true
            }
        }

        if let result = await APIClient.sendFirstOK(
            method: "POST",
            paths: ["/api/nutrition/save-meal"],
            json: payload
        ) {
            meal.remoteId = APIClient.stringID(from: result, keys: ["mealId", "id"]) ?? meal.remoteId
            return true
        }
        return false
    }

    private func push(tick: HabitEntry) async -> Bool {
        let payload: [String: Any] = [
            "date": tick.day,
            "key": tick.key,
            "tick": tick.value,
            "value": tick.value,
        ]
        return await APIClient.sendFirstOK(
            method: "POST",
            paths: ["/api/habits/responses", "/api/habits", "/api/questions/responses"],
            json: payload
        ) != nil
    }

    private func push(weight: WeightSample) async -> Bool {
        let payload: [String: Any] = [
            "date": weight.day,
            "kg": weight.kg,
            "metric": "weight_kg",
            "value": weight.kg,
            "unit": "kg",
        ]
        return await APIClient.sendFirstOK(
            method: "POST",
            paths: ["/api/health/metrics", "/api/health/weight", "/api/sync/weight"],
            json: payload
        ) != nil
    }

    private func push(tombstone: SyncTombstone) async -> Bool {
        switch tombstone.kind {
        case "habit":
            return true
        case "meal":
            if !tombstone.remoteId.isEmpty {
                let byId = await APIClient.sendFirstOK(
                    method: "DELETE",
                    paths: [
                        "/api/nutrition/meals/\(tombstone.remoteId)",
                        "/api/sync/meals/\(tombstone.remoteId)",
                    ]
                )
                if byId != nil { return true }
            }
            if !tombstone.day.isEmpty, !tombstone.key.isEmpty {
                let encoded = tombstone.key.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? tombstone.key
                return await APIClient.sendFirstOK(
                    method: "DELETE",
                    paths: ["/api/nutrition/meals?date=\(tombstone.day)&name=\(encoded)"]
                ) != nil
            }
            return true
        case "workout":
            guard !tombstone.remoteId.isEmpty else { return true }
            return await APIClient.sendFirstOK(
                method: "DELETE",
                paths: [
                    "/api/workouts/\(tombstone.remoteId)",
                    "/api/sync/workouts/\(tombstone.remoteId)",
                ]
            ) != nil
        default:
            return true
        }
    }

    private func workoutJSON(_ workout: LoggedWorkout) -> [String: Any] {
        let exercises = workout.exercises
            .sorted { $0.orderIndex < $1.orderIndex }
            .map { exercise -> [String: Any] in
                let sets = exercise.sets
                    .sorted { $0.setIndex < $1.setIndex }
                    .map { set -> [String: Any] in
                        [
                            "reps": set.reps,
                            "weightKg": set.weightKg,
                        ]
                    }
                return [
                    "name": exercise.name,
                    "sets": sets,
                ]
            }
        var body: [String: Any] = [
            "name": workout.name,
            "date": DayStamp.from(workout.date),
            "notes": workout.notes,
            "source": "manual",
            "exercises": exercises,
        ]
        if let id = workout.remoteId { body["id"] = id }
        return body
    }

    private func mealJSON(_ meal: MealLog) -> [String: Any] {
        var body: [String: Any] = [
            "date": meal.day,
            "mealName": meal.name,
            "mealType": meal.mealType.lowercased(),
            "foods": [
                [
                    "name": meal.name,
                    "calories": meal.calories,
                    "proteinG": meal.proteinG,
                    "carbsG": meal.carbsG,
                    "fatG": meal.fatG,
                ],
            ],
        ]
        if let id = meal.remoteId { body["id"] = id }
        return body
    }
}
