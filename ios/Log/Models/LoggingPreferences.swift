import Foundation
import Observation
import SwiftUI

@MainActor
@Observable
final class AppearancePreference {
    enum Mode: String, CaseIterable, Identifiable {
        case system
        case light
        case dark

        var id: String { rawValue }

        var title: String {
            switch self {
            case .system: return "System"
            case .light: return "Light"
            case .dark: return "Dark"
            }
        }

        var preferredScheme: ColorScheme? {
            switch self {
            case .system: return nil
            case .light: return .light
            case .dark: return .dark
            }
        }
    }

    static let storageKey = "log.appearance"

    var mode: Mode {
        didSet { defaults.set(mode.rawValue, forKey: Self.storageKey) }
    }

    var preferredScheme: ColorScheme? { mode.preferredScheme }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let raw = defaults.string(forKey: Self.storageKey), let stored = Mode(rawValue: raw) {
            mode = stored
        } else {
            mode = .system
        }
    }

    private let defaults: UserDefaults
}

@MainActor
@Observable
final class LoggingPreferences {
    enum Key {
        static let workouts = "log.track.workouts"
        static let food = "log.track.food"
        static let weight = "log.track.weight"
        static let habits = "log.track.habits"
        static let activity = "log.track.activity"
    }

    var workouts: Bool {
        didSet { store(workouts, Key.workouts) }
    }

    var food: Bool {
        didSet { store(food, Key.food) }
    }

    var weight: Bool {
        didSet { store(weight, Key.weight) }
    }

    var habits: Bool {
        didSet { store(habits, Key.habits) }
    }

    var activity: Bool {
        didSet { store(activity, Key.activity) }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        workouts = Self.read(defaults, Key.workouts)
        food = Self.read(defaults, Key.food)
        weight = Self.read(defaults, Key.weight)
        habits = Self.read(defaults, Key.habits)
        activity = Self.read(defaults, Key.activity)
    }

    private let defaults: UserDefaults

    private func store(_ value: Bool, _ key: String) {
        defaults.set(value, forKey: key)
    }

    /// Missing keys default on so current users keep every section.
    private static func read(_ defaults: UserDefaults, _ key: String) -> Bool {
        defaults.object(forKey: key) as? Bool ?? true
    }
}
