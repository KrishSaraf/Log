import SwiftUI

struct TickControl: View {
    let value: String?
    let onChange: (String?) -> Void
    @State private var hapticTick = 0

    private var done: Bool { value == "yes" || value == "partial" }
    private var half: Bool { value == "partial" }

    var body: some View {
        Button {
            onChange(done ? nil : "yes")
            hapticTick += 1
        } label: {
            ZStack {
                Image(systemName: "circle")
                    .font(.system(size: 26, weight: .regular))
                    .foregroundStyle(Palette.faint)
                    .opacity(done ? 0 : 1)
                    .scaleEffect(done ? 0.25 : 1)
                    .blur(radius: done ? 4 : 0)

                Image(systemName: half ? "circle.lefthalf.filled" : "checkmark.circle.fill")
                    .font(.system(size: 26, weight: .regular))
                    .foregroundStyle(Palette.accent)
                    .opacity(done ? 1 : 0)
                    .scaleEffect(done ? 1 : 0.25)
                    .blur(radius: done ? 0 : 4)
            }
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
            .animation(.easeOut(duration: 0.18), value: done)
            .animation(.easeOut(duration: 0.18), value: half)
        }
        .buttonStyle(PressScaleStyle())
        .sensoryFeedback(.selection, trigger: hapticTick)
        .accessibilityLabel(done ? (half ? "Half done" : "Done") : "Not logged")
        .accessibilityAddTraits(.isButton)
        .contextMenu {
            Button("Done") { onChange("yes"); hapticTick += 1 }
            Button("Half") { onChange("partial"); hapticTick += 1 }
            Button("Missed") { onChange("no"); hapticTick += 1 }
            Button("Clear", role: .destructive) { onChange(nil) }
        }
    }
}
