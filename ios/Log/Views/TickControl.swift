import SwiftUI

struct TickControl: View {
    let value: String?
    var tint: Color = Palette.accent
    let onChange: (String?) -> Void
    @State private var hapticTick = 0

    private var done: Bool { HabitActions.isFilled(value) }

    var body: some View {
        Button {
            onChange(HabitActions.toggle(value))
            hapticTick += 1
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(done ? tint : Color.clear)
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(done ? Color.clear : Palette.lineStrong, lineWidth: 1.5)
                if done {
                    Image(systemName: "checkmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
            .frame(width: 28, height: 28)
            .frame(width: 44, height: 44)
            .contentShape(Rectangle())
            .animation(.easeOut(duration: 0.16), value: done)
        }
        .buttonStyle(PressScaleStyle())
        .sensoryFeedback(.selection, trigger: hapticTick)
        .accessibilityLabel(done ? "Done" : "Not logged")
        .contextMenu {
            Button("Done") { onChange("yes"); hapticTick += 1 }
            Button("Half") { onChange("partial"); hapticTick += 1 }
            Button("Clear", role: .destructive) { onChange(nil) }
        }
    }
}
