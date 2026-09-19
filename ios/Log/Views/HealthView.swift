import SwiftUI
import SwiftData
import UIKit

struct HealthView: View {
    @Environment(HealthKitService.self) private var health
    @Environment(\.modelContext) private var context
    @Environment(SyncEngine.self) private var sync
    @Query(sort: \WeightSample.day, order: .reverse) private var weights: [WeightSample]
    @AppStorage(WeightUnit.storageKey) private var unitRaw = WeightUnit.kg.rawValue
    @State private var weightPulse = 0
    @State private var showSettings = false

    private var unit: WeightUnit { WeightUnit(rawValue: unitRaw) ?? .kg }
    private var latestKg: Double? { weights.first?.kg ?? health.snapshot.weightKg }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Palette.Space.section) {
                    if health.access != .authorized {
                        AccessBanner(access: health.access, action: handleAccess)
                    } else {
                        DayStrip(
                            calories: health.snapshot.activeCalories,
                            exercise: health.snapshot.exerciseMinutes,
                            stand: health.snapshot.standHours
                        )
                        GroupedCard {
                            metricRow("Steps", Formatters.int(health.snapshot.steps), "")
                            ListRowDivider()
                            metricRow("Sleep", Formatters.oneDecimal(health.snapshot.sleepHours), "hr")
                            ListRowDivider()
                            metricRow("Resting HR", Formatters.int(health.snapshot.restingHeartRate), "bpm")
                            ListRowDivider()
                            metricRow("Heart Rate", Formatters.int(health.snapshot.averageHeartRate), "bpm")
                        }
                    }

                    weightHero

                    if weights.count >= 2 {
                        WeightChart(samples: weights, unit: unit)
                            .cardSurface(padding: 12)
                    }
                }
                .padding(Palette.Space.screen)
                .padding(.bottom, 12)
            }
            .refreshable {
                await health.refresh()
                await sync.refresh(context: context)
            }
            .modifier(Screen())
            .navigationTitle("Health")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Settings")
                }
            }
            .sheet(isPresented: $showSettings) { TrackingSettingsView() }
            .sensoryFeedback(.success, trigger: weightPulse)
        }
    }

    private var todayLogged: Bool {
        weights.contains { $0.day == DayStamp.today() }
    }

    private var weightHero: some View {
        HStack(alignment: .bottom, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Weight")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.muted)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(unit.format(latestKg))
                        .font(.system(size: 52, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Palette.ink)
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                        .contentTransition(.numericText())
                    if latestKg != nil {
                        Text(unit.suffix)
                            .font(.system(size: 22, weight: .semibold, design: .rounded))
                            .foregroundStyle(Palette.muted)
                    }
                }
            }
            Spacer(minLength: 8)
            Button(todayLogged ? "Logged" : "Log") { logWeightNow() }
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Palette.onAccent)
                .padding(.horizontal, 18)
                .frame(minHeight: 40)
                .background(Palette.accent, in: Capsule())
                .buttonStyle(PressScaleStyle(enabled: !todayLogged))
                .disabled(todayLogged)
                .opacity(todayLogged ? 0.45 : 1)
        }
        .cardSurface()
    }

    private func metricRow(_ label: String, _ value: String, _ unit: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.system(size: 17))
                .foregroundStyle(Palette.ink)
            Spacer()
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 17, weight: .regular, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.ink)
                if value != "—" && !unit.isEmpty {
                    Text(unit)
                        .font(.system(size: 15))
                        .foregroundStyle(Palette.muted)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
    }

    private func logWeightNow() {
        let kg = health.snapshot.weightKg ?? weights.first?.kg
        if WeightLog.saveToday(context: context, weights: weights, kg: kg, sync: sync) {
            weightPulse += 1
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
