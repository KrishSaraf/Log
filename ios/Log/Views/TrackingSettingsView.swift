import SwiftUI

struct TrackingSettingsView: View {
    @Environment(LoggingPreferences.self) private var prefs
    @Environment(AppearancePreference.self) private var appearance
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
                        .background(Palette.surface, in: RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: Palette.Radius.card, style: .continuous)
                                .stroke(Palette.line, lineWidth: 1)
                        )
                    }
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
