import SwiftUI

struct TickControl: View {
    let value: String?
    let onChange: (String?) -> Void

    var body: some View {
        HStack(spacing: 6) {
            chip("yes", mark: "✓")
            chip("partial", mark: "½")
            chip("no", mark: "×")
        }
    }

    private func chip(_ key: String, mark: String) -> some View {
        let on = value == key
        return Button {
            onChange(on ? nil : key)
        } label: {
            Text(mark)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .frame(width: 32, height: 28)
                .foregroundStyle(on ? Palette.bg : Palette.ink)
                .background(on ? Palette.rust : Palette.surface)
                .overlay(Rectangle().stroke(Palette.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
