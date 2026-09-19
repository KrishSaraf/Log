import SwiftUI
import SwiftData
import UIKit

struct LogWeightSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync
    @Query private var weights: [WeightSample]

    var sample: WeightSample?

    @State private var kg = ""
    @State private var date = Date()
    @State private var didLoad = false

    private var isEditing: Bool { sample != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    DatePicker("Day", selection: $date, displayedComponents: .date)
                        .font(.system(size: 16, design: .serif))
                        .foregroundStyle(Palette.ink)

                    VStack(alignment: .leading, spacing: 6) {
                        SectionLabel(text: "KILOGRAMS")
                        TextField("0.0", text: $kg)
                            .keyboardType(.decimalPad)
                            .font(.system(size: 28, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Palette.ink)
                            .padding(.bottom, 8)
                            .overlay(alignment: .bottom) {
                                Rectangle().fill(Palette.line).frame(height: 1)
                            }
                    }

                    PrimaryButton(title: isEditing ? "Save changes" : "Save weight") {
                        save()
                    }
                }
                .padding(20)
            }
            .background(Palette.bg.ignoresSafeArea())
            .navigationTitle(isEditing ? "Edit weight" : "Log weight")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(Palette.muted)
                }
            }
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .onAppear { loadIfNeeded() }
    }

    private func loadIfNeeded() {
        guard !didLoad else { return }
        didLoad = true
        if let sample {
            kg = String(format: "%g", sample.kg)
            date = DayStamp.date(from: sample.day) ?? .now
        }
    }

    private func save() {
        guard let value = Double(kg.replacingOccurrences(of: ",", with: ".")), value > 0 else { return }
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
