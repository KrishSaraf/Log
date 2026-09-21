import SwiftUI
import UIKit

struct TrackingSettingsView: View {
    @Environment(LoggingPreferences.self) private var prefs
    @Environment(AppearancePreference.self) private var appearance
    @Environment(HealthKitService.self) private var health
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        @Bindable var prefs = prefs
        @Bindable var appearance = appearance
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Palette.Space.section) {
                    VStack(alignment: .leading, spacing: 10) {
                        SectionLabel(text: "Appearance")
                        Picker("Appearance", selection: $appearance.mode) {
                            ForEach(AppearancePreference.Mode.allCases) { mode in
                                Text(mode.title).tag(mode)
                            }
                        }
                        .pickerStyle(.segmented)
                        .tint(Palette.accent)
                    }
                    .cardSurface()

                    connectionsCard

                    VStack(alignment: .leading, spacing: 4) {
                        SectionLabel(text: "What I track")
                        Text("Today and the tabs will follow.")
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.muted)
                            .padding(.bottom, 6)

                        VStack(spacing: 0) {
                            row("Workouts", isOn: $prefs.workouts)
                            ListRowDivider()
                            row("Food", isOn: $prefs.food)
                            ListRowDivider()
                            row("Weight", isOn: $prefs.weight)
                            ListRowDivider()
                            row("Habits", isOn: $prefs.habits)
                            ListRowDivider()
                            row("Activity rings", isOn: $prefs.activity)
                        }
                        .groupedFill()
                    }

                    WebsiteSettingsCard()
                }
                .padding(Palette.Space.screen)
            }
            .modifier(Screen())
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private var connectionsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "Connections")
            Text("Log is a health home — pull activity, sleep, and vitals from the platforms you already use.")
                .font(.system(size: 15))
                .foregroundStyle(Palette.muted)

            VStack(spacing: 0) {
                connectionRow(
                    title: "Apple Health",
                    detail: healthKitDetail,
                    actionTitle: healthKitActionTitle,
                    enabled: health.access != .unavailable,
                    action: handleHealthKit
                )
                ListRowDivider()
                connectionRow(
                    title: "Health Connect",
                    detail: "Android · coming soon",
                    actionTitle: "Soon",
                    enabled: false,
                    action: {}
                )
                ListRowDivider()
                connectionRow(
                    title: "Google Fit",
                    detail: "Legacy · coming soon",
                    actionTitle: "Soon",
                    enabled: false,
                    action: {}
                )
            }
            .groupedFill()
        }
    }

    private var healthKitDetail: String {
        switch health.access {
        case .authorized: return "Connected · rings, heart, sleep"
        case .denied: return "Permission off — open Settings"
        case .unavailable: return "Not available on this device"
        case .needed, .unknown: return "Activity, heart rate, sleep, workouts"
        }
    }

    private var healthKitActionTitle: String {
        switch health.access {
        case .authorized: return "Connected"
        case .denied: return "Open Settings"
        case .unavailable: return "Unavailable"
        case .needed, .unknown: return "Connect"
        }
    }

    private func handleHealthKit() {
        if health.access == .denied, let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
            return
        }
        if health.access == .authorized { return }
        Task { await health.requestAccess() }
    }

    private func connectionRow(
        title: String,
        detail: String,
        actionTitle: String,
        enabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(Palette.ink)
                Text(detail)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.muted)
            }
            Spacer(minLength: 8)
            Button(actionTitle, action: action)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(enabled ? Palette.onAccent : Palette.muted)
                .padding(.horizontal, 12)
                .frame(minHeight: 34)
                .background(
                    enabled ? Palette.accent : Palette.line,
                    in: Capsule()
                )
                .disabled(!enabled || actionTitle == "Connected" || actionTitle == "Soon")
                .opacity(actionTitle == "Connected" ? 0.55 : 1)
        }
        .padding(.horizontal, Palette.Space.cardPad)
        .padding(.vertical, 12)
        .frame(minHeight: 56)
    }

    private func row(_ title: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
            Text(title)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Palette.ink)
        }
        .tint(Palette.accent)
        .padding(.horizontal, Palette.Space.cardPad)
        .padding(.vertical, 12)
        .frame(minHeight: 48)
    }
}
