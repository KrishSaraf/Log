import Foundation
import SwiftData

@Model
final class LoggedWorkout {
    var id: UUID
    var name: String
    var date: Date
    var notes: String
    @Relationship(deleteRule: .cascade, inverse: \LoggedExercise.workout)
    var exercises: [LoggedExercise]

    init(name: String, date: Date = .now, notes: String = "", exercises: [LoggedExercise] = []) {
        self.id = UUID()
        self.name = name
        self.date = date
        self.notes = notes
        self.exercises = exercises
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
