import { BarbellIcon } from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/kit";
import { formatDayWeekday, formatMonthYear } from "@/lib/format";
import type { WorkoutSession } from "@/lib/habits";

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function SessionHistory({ sessions }: { sessions: WorkoutSession[] }) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={BarbellIcon}
        title="No sessions recorded"
        description="Workouts you log will list here, newest first."
      />
    );
  }

  let lastMonth = "";

  return (
    <ol className="divide-y divide-line">
      {sessions.map((session) => {
        const month = monthKey(session.date);
        const showMonth = month !== lastMonth;
        lastMonth = month;
        return (
          <li key={session.id}>
            {showMonth ? (
              <p className="bg-surface-sunken px-4 py-2 text-xs font-medium text-text">
                {formatMonthYear(session.date)}
              </p>
            ) : null}
            <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-text">{session.name}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {formatDayWeekday(session.date)}
                  {" · "}
                  {session.exerciseCount === 1
                    ? "1 exercise"
                    : `${session.exerciseCount} exercises`}
                </p>
                {session.notes ? (
                  <p className="mt-0.5 truncate text-xs text-text-faint">{session.notes}</p>
                ) : null}
              </div>
              <time
                dateTime={session.date}
                className="num shrink-0 text-xs text-text-muted"
              >
                {formatDayWeekday(session.date)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
