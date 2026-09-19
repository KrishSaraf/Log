import { Fragment } from "react";
import { CheckIcon, MinusIcon, XIcon } from "@phosphor-icons/react/dist/ssr";

import { ChartLegend } from "@/components/kit";
import { CHART_COLORS, CHART_SIGNAL } from "@/lib/chart-theme";
import type { HabitCell, HabitQuestion, HabitRange } from "@/lib/habits";
import { formatDayWeekday, formatKg, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";

function cellLabel(habit: string, date: string, cell: HabitCell | undefined) {
  const when = formatDayWeekday(date);
  if (!cell) return `${habit}, ${when}, not logged`;
  if (cell.tick === "no") return `${habit}, ${when}, not done`;
  if (cell.tick === "partial") {
    return cell.note
      ? `${habit}, ${when}, partly · ${cell.note}`
      : `${habit}, ${when}, partly`;
  }
  return cell.note ? `${habit}, ${when}, ${cell.note}` : `${habit}, ${when}, done`;
}

function TickMark({ cell }: { cell: HabitCell | undefined }) {
  if (!cell) {
    return <span className="block size-3.5" aria-hidden />;
  }
  if (cell.tick === "yes") {
    return (
      <span
        className="flex size-3.5 items-center justify-center rounded-full bg-ember text-on-ember"
        aria-hidden
      >
        <CheckIcon size={10} weight="bold" />
      </span>
    );
  }
  if (cell.tick === "partial") {
    return (
      <span
        className="flex size-3.5 items-center justify-center rounded-full border border-ember-line bg-ember-quiet text-ember"
        aria-hidden
      >
        <MinusIcon size={10} weight="bold" />
      </span>
    );
  }
  return (
    <span className="flex size-3.5 items-center justify-center text-text-faint" aria-hidden>
      <XIcon size={11} weight="bold" />
    </span>
  );
}

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function HabitGrid({
  questions,
  ranges,
}: {
  questions: HabitQuestion[];
  ranges: HabitRange[];
}) {
  if (questions.length === 0 || ranges.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="max-h-[36rem] overflow-auto">
        <table className="min-w-max border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-30 bg-surface px-3 py-2 text-left label-caps"
              >
                Day
              </th>
              {questions.map((question) => (
                <th
                  key={question.id}
                  scope="col"
                  className="bg-surface px-1.5 py-2 text-center label-caps"
                >
                  <span className="inline-block max-w-16 truncate align-bottom">
                    {question.label}
                  </span>
                </th>
              ))}
              <th scope="col" className="bg-surface px-3 py-2 text-right label-caps">
                kg
              </th>
            </tr>
          </thead>
          {ranges.map((range) => {
            let lastMonth = "";
            return (
              <tbody key={`${range.start}:${range.end}`}>
                {range.days.map((day) => {
                  const month = monthKey(day.date);
                  const showMonth = month !== lastMonth;
                  lastMonth = month;
                  return (
                    <Fragment key={day.date}>
                      {showMonth ? (
                        <tr>
                          <td
                            colSpan={questions.length + 2}
                            className="sticky left-0 bg-surface-sunken px-3 pt-3 pb-1.5 text-xs font-medium text-text"
                          >
                            {formatMonthYear(day.date)}
                          </td>
                        </tr>
                      ) : null}
                      <tr className="group">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-surface px-3 py-1 text-left text-xs font-normal text-text-muted group-hover:bg-surface-raised"
                        >
                          {formatDayWeekday(day.date)}
                        </th>
                        {questions.map((question) => {
                          const cell = day.cells[question.key];
                          return (
                            <td
                              key={question.key}
                              title={cellLabel(question.label, day.date, cell)}
                              aria-label={cellLabel(question.label, day.date, cell)}
                              className="px-1.5 py-1"
                            >
                              <span className="flex justify-center">
                                <TickMark cell={cell} />
                              </span>
                            </td>
                          );
                        })}
                        <td
                          className={cn(
                            "px-3 py-1 text-right text-xs",
                            day.weightKg === null ? "text-text-faint" : "num text-text",
                          )}
                        >
                          {day.weightKg === null ? "—" : formatKg(day.weightKg)}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
      <ChartLegend
        className="px-1"
        items={[
          { label: "Done", color: CHART_COLORS.ember },
          { label: "Partly", color: CHART_COLORS.amber },
          { label: "Not done", color: CHART_COLORS.ash },
        ]}
      />
    </div>
  );
}
