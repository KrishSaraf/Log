import SwiftUI

struct ActivityRings: View {
    let move: Double
    let exercise: Double
    let stand: Double

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            let line = max(8, side * 0.125)
            let gap = max(2.5, side * 0.04)
            let inset = line / 2

            ZStack {
                ring(progress: move, color: Palette.move, line: line)
                    .padding(inset)
                ring(progress: exercise, color: Palette.exercise, line: line)
                    .padding(inset + line + gap)
                ring(progress: stand, color: Palette.stand, line: line)
                    .padding(inset + 2 * (line + gap))
            }
            .frame(width: side, height: side)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityHidden(true)
    }

    private func ring(progress: Double, color: Color, line: CGFloat) -> some View {
        let clamped = min(max(progress, 0), 1)
        return ZStack {
            Circle()
                .stroke(color.opacity(0.22), lineWidth: line)
            if clamped > 0 {
                Circle()
                    .trim(from: 0, to: clamped)
                    .stroke(color, style: StrokeStyle(lineWidth: line, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
        }
    }
}
