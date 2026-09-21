import SwiftUI
import SwiftData

enum WeightUnit: String, CaseIterable {
    case kg
    case lb

    static let storageKey = "log.weightUnit"
    private static let lbPerKg = 2.2046226218

    var suffix: String {
        switch self {
        case .kg: return "kg"
        case .lb: return "lb"
        }
    }

    var wholeRange: ClosedRange<Int> {
        switch self {
        case .kg: return 20...250
        case .lb: return 44...550
        }
    }

    func fromKg(_ kg: Double) -> Double {
        switch self {
        case .kg: return kg
        case .lb: return kg * Self.lbPerKg
        }
    }

    func toKg(_ value: Double) -> Double {
        switch self {
        case .kg: return value
        case .lb: return value / Self.lbPerKg
        }
    }

    func format(_ kg: Double?) -> String {
        guard let kg else { return "—" }
        return String(format: "%.1f", fromKg(kg))
    }
}

enum WeightLog {
    @discardableResult
    @MainActor
    static func saveToday(
        context: ModelContext,
        weights: [WeightSample],
        kg: Double?,
        sync: SyncEngine
    ) -> Bool {
        guard let kg, kg > 0 else { return false }
        let value = (kg * 100).rounded() / 100
        let day = DayStamp.today()
        if let existing = weights.first(where: { $0.day == day }) {
            existing.kg = value
            existing.needsPush = true
            existing.updatedAt = .now
        } else {
            context.insert(WeightSample(day: day, kg: value, needsPush: true))
        }
        try? context.save()
        sync.pushQuietly(context: context)
        return true
    }
}

struct LogWeightSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync
    @Environment(HealthKitService.self) private var health
    @Query(sort: \WeightSample.day, order: .reverse) private var weights: [WeightSample]
    @AppStorage(WeightUnit.storageKey) private var unitRaw = WeightUnit.kg.rawValue

    var sample: WeightSample? = nil

    @State private var kgValue = 70.0
    @State private var date = Date()
    @State private var didLoad = false

    private var isEditing: Bool { sample != nil }
    private var unit: WeightUnit { WeightUnit(rawValue: unitRaw) ?? .kg }

    private var displayTenths: Int {
        Int((unit.fromKg(kgValue) * 10).rounded())
    }

    private var wholePart: Int { displayTenths / 10 }
    private var tenthPart: Int { abs(displayTenths % 10) }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Spacer(minLength: 12)

                Text(String(format: "%.1f", unit.fromKg(kgValue)))
                    .font(.system(size: 72, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                    .minimumScaleFactor(0.4)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)

                Text(unit.suffix)
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .foregroundStyle(Palette.muted)
                    .padding(.top, 2)

                Picker("Unit", selection: $unitRaw) {
                    Text("kg").tag(WeightUnit.kg.rawValue)
                    Text("lb").tag(WeightUnit.lb.rawValue)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 72)
                .padding(.top, 20)

                HStack(spacing: 36) {
                    stepButton(systemName: "minus", filled: false) { step(-1) }
                    stepButton(systemName: "plus", filled: true) { step(1) }
                }
                .padding(.top, 22)

                wheels
                    .padding(.horizontal, 8)

                dateRow
                    .padding(.horizontal, 20)
                    .padding(.top, 4)

                Spacer(minLength: 8)

                PrimaryButton(title: "Save") {
                    save()
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle(isEditing ? "Edit Weight" : "Weight")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Palette.muted)
                }
            }
            .tint(Palette.rust)
        }
        .presentationBackground(Palette.bg)
        .sensoryFeedback(.selection, trigger: displayTenths)
        .onAppear { loadIfNeeded() }
    }

    private var wheels: some View {
        HStack(spacing: 0) {
            Picker("Whole", selection: wholeBinding) {
                ForEach(Array(unit.wholeRange), id: \.self) { value in
                    Text("\(value)")
                        .font(.system(size: 22, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .tag(value)
                }
            }
            .pickerStyle(.wheel)
            .frame(maxWidth: .infinity)

            Text(".")
                .font(.system(size: 28, weight: .semibold, design: .rounded))
                .foregroundStyle(Palette.ink)
                .padding(.bottom, 2)

            Picker("Tenth", selection: tenthBinding) {
                ForEach(0...9, id: \.self) { value in
                    Text("\(value)")
                        .font(.system(size: 22, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .tag(value)
                }
            }
            .pickerStyle(.wheel)
            .frame(width: 72)

            Text(unit.suffix)
                .font(.system(size: 17, weight: .semibold, design: .rounded))
                .foregroundStyle(Palette.muted)
                .frame(width: 36, alignment: .leading)
        }
        .frame(height: 148)
        .mask(
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0),
                    .init(color: .black, location: 0.18),
                    .init(color: .black, location: 0.82),
                    .init(color: .clear, location: 1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    private var dateRow: some View {
        HStack {
            Text("Date")
                .font(.system(size: 17))
                .foregroundStyle(Palette.ink)
            Spacer()
            DatePicker("Date", selection: $date, displayedComponents: .date)
                .labelsHidden()
                .tint(Palette.accent)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var wholeBinding: Binding<Int> {
        Binding(
            get: { min(max(wholePart, unit.wholeRange.lowerBound), unit.wholeRange.upperBound) },
            set: { setDisplay(whole: $0, tenth: tenthPart) }
        )
    }

    private var tenthBinding: Binding<Int> {
        Binding(
            get: { tenthPart },
            set: { setDisplay(whole: wholePart, tenth: $0) }
        )
    }

    private func stepButton(systemName: String, filled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(filled ? Palette.onAccent : Palette.ink)
                .frame(width: 48, height: 48)
                .background(
                    filled ? Palette.rust : Palette.surface,
                    in: Circle()
                )
                .overlay {
                    if !filled {
                        Circle().stroke(Palette.line, lineWidth: 1)
                    }
                }
        }
        .buttonStyle(.plain)
        .buttonRepeatBehavior(.enabled)
        .accessibilityLabel(systemName == "plus" ? "Increase weight" : "Decrease weight")
    }

    private func setDisplay(whole: Int, tenth: Int) {
        let clampedWhole = min(max(whole, unit.wholeRange.lowerBound), unit.wholeRange.upperBound)
        let clampedTenth = min(max(tenth, 0), 9)
        kgValue = unit.toKg(Double(clampedWhole) + Double(clampedTenth) / 10)
    }

    private func step(_ deltaTenths: Int) {
        let next = displayTenths + deltaTenths
        let minTenths = unit.wholeRange.lowerBound * 10
        let maxTenths = unit.wholeRange.upperBound * 10 + 9
        let clamped = min(max(next, minTenths), maxTenths)
        kgValue = unit.toKg(Double(clamped) / 10)
    }

    private func loadIfNeeded() {
        guard !didLoad else { return }
        didLoad = true
        if let sample {
            kgValue = sample.kg
            date = DayStamp.date(from: sample.day) ?? .now
        } else {
            kgValue = weights.first?.kg ?? health.snapshot.weightKg ?? 70
            date = .now
        }
    }

    private func save() {
        let value = (kgValue * 100).rounded() / 100
        guard value > 0 else { return }
        let day = DayStamp.from(date)
        if let sample {
            sample.kg = value
            sample.day = day
            sample.needsPush = true
            sample.updatedAt = .now
        } else if let existing = weights.first(where: { $0.day == day }) {
            existing.kg = value
            existing.needsPush = true
            existing.updatedAt = .now
        } else {
            context.insert(WeightSample(day: day, kg: value, needsPush: true))
        }
        try? context.save()
        sync.pushQuietly(context: context)
        dismiss()
    }
}
