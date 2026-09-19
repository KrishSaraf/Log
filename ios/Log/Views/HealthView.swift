import SwiftUI
import SwiftData
import UIKit

struct HealthView: View {
    @Environment(HealthKitService.self) private var health
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync
    @Query(sort: \WeightSample.day, order: .reverse) private var weights: [WeightSample]
    @State private var logging = false
    @State private var editing: WeightSample?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 20) {
                    if health.access != .authorized {
                        AccessBanner(access: health.access, action: handleAccess)
                    } else {
                        DayStrip(
                            calories: health.snapshot.activeCalories,
                            exercise: health.snapshot.exerciseMinutes,
                            stand: health.snapshot.standHours
                        )
                        stat("Steps today", Formatters.int(health.snapshot.steps), "")
                        stat("Sleep last night", Formatters.oneDecimal(health.snapshot.sleepHours), "hr")
                        stat("Resting heart rate", Formatters.int(health.snapshot.restingHeartRate), "bpm")
                        stat("Heart rate today", Formatters.int(health.snapshot.averageHeartRate), "bpm avg")
                    }

                    let latest = weights.first?.kg ?? health.snapshot.weightKg
                    stat("Weight", Formatters.oneDecimal(latest), "kg")

                    Button("Log weight") { logging = true }
                        .buttonStyle(BlockButtonStyle())

                    if !weights.isEmpty {
                        SectionLabel(text: "WEIGHT HISTORY")
                        Text("\(weights.count) readings")
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.muted)
                        ForEach(weights, id: \.day) { sample in
                            Button { editing = sample } label: {
                                HStack {
                                    Text(DayStamp.pretty(sample.day))
                                        .font(.system(size: 15, design: .serif))
                                        .foregroundStyle(Palette.ink)
                                    Spacer()
                                    Text("\(Formatters.oneDecimal(sample.kg)) kg")
                                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                                        .monospacedDigit()
                                        .foregroundStyle(Palette.ink)
                                }
                                .padding(.vertical, 8)
                                .overlay(alignment: .bottom) {
                                    Rectangle().fill(Palette.line).frame(height: 1)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(20)
            }
            .refreshable {
                await health.refresh()
                await sync.refresh(context: context)
            }
            .modifier(Screen())
            .navigationTitle("Health")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $logging) { LogWeightSheet() }
            .sheet(item: $editing) { sample in
                LogWeightSheet(sample: sample)
            }
        }
    }

    private func stat(_ label: String, _ value: String, _ unit: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.system(size: 16, design: .serif))
                .foregroundStyle(Palette.ink)
            Spacer()
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                if value != "—" && !unit.isEmpty {
                    Text(unit)
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.muted)
                }
            }
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Palette.line).frame(height: 1)
        }
    }

    private func handleAccess() {
        if health.access == .denied, let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
            return
        }
        Task { await health.requestAccess() }
    }
}
