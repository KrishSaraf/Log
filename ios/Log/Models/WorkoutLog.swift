import Foundation
import SwiftData

@Model
final class LoggedWorkout {
    var id: UUID
    var name: String
    var date: Date
    var notes: String
    var remoteId: String? = nil
    var needsPush: Bool = false
    var updatedAt: Date = Date()
    @Relationship(deleteRule: .cascade, inverse: \LoggedExercise.workout)
    var exercises: [LoggedExercise]

    init(
        id: UUID = UUID(),
        name: String,
        date: Date = .now,
        notes: String = "",
        exercises: [LoggedExercise] = [],
        remoteId: String? = nil,
        needsPush: Bool = true
    ) {
        self.id = id
        self.name = name
        self.date = date
        self.notes = notes
        self.exercises = exercises
        self.remoteId = remoteId
        self.needsPush = needsPush
        self.updatedAt = .now
    }
}

@Model
final class LoggedExercise {
    var id: UUID
    var name: String
    var orderIndex: Int
    var workout: LoggedWorkout?
    @Relationship(deleteRule: .cascade, inverse: \LoggedSet.exercise)
    var sets: [LoggedSet]

    init(name: String, orderIndex: Int, sets: [LoggedSet] = []) {
        self.id = UUID()
        self.name = name
        self.orderIndex = orderIndex
        self.sets = sets
    }
}

@Model
final class LoggedSet {
    var id: UUID
    var setIndex: Int
    var reps: Int
    var weightKg: Double
    var exercise: LoggedExercise?

    init(setIndex: Int, reps: Int, weightKg: Double) {
        self.id = UUID()
        self.setIndex = setIndex
        self.reps = reps
        self.weightKg = weightKg
    }
}
