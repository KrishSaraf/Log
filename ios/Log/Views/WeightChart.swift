import Charts
import SwiftUI

struct WeightChart: View {
    let samples: [WeightSample]
    var unit: WeightUnit = .kg

    private var points: [(day: Date, kg: Double)] {
        samples.compactMap { sample in
            guard let day = DayStamp.date(from: sample.day) else { return nil }
            return (day, sample.kg)
        }
        .sorted { $0.day < $1.day }
    }

    var body: some View {
        let values = points.map { unit.fromKg($0.kg) }
        let minValue = (values.min() ?? 0) - 1
        let maxValue = (values.max() ?? 1) + 1

        Chart(points, id: \.day) { point in
            LineMark(
                x: .value("Day", point.day),
                y: .value("Weight", unit.fromKg(point.kg))
            )
            .foregroundStyle(Palette.accent)
            .interpolationMethod(.catmullRom)
            AreaMark(
                x: .value("Day", point.day),
                y: .value("Weight", unit.fromKg(point.kg))
            )
            .foregroundStyle(Palette.accent.opacity(0.14))
            .interpolationMethod(.catmullRom)
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                    .foregroundStyle(Palette.line)
                AxisValueLabel()
                    .foregroundStyle(Palette.muted)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { _ in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                    .foregroundStyle(Palette.line)
                AxisValueLabel()
                    .foregroundStyle(Palette.muted)
            }
        }
        .chartYScale(domain: min(minValue, maxValue - 1)...max(maxValue, minValue + 1))
        .chartLegend(.hidden)
        .frame(height: 220)
        .padding(.vertical, 8)
        .padding(.horizontal, 4)
        .accessibilityLabel("Weight over time")
    }
}
