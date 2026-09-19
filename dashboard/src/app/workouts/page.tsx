import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarbellIcon, ListMagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { count, desc, eq } from "drizzle-orm";

import { WorkoutAiLogger } from "@/components/workouts/workout-ai-logger";
import { SessionHistory } from "@/components/workouts/session-history";
import { MetricCard, Panel, PanelBody, PanelHeader, PanelTitle } from "@/components/kit";
import { db, exercises, workoutExercises, workouts, workoutSets } from "@/db";
import { getDashboardUserId } from "@/lib/auth-user";
import { formatShortDate } from "@/lib/format";
import { loadHabitsDashboard } from "@/lib/habits";
import { safely } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Workouts" };

export default async function WorkoutsPage() {
  const userId = await getDashboardUserId();
  if (!userId) redirect("/sign-in");

  const [data, setCount, libraryCount, lastDate] = await Promise.all([
    loadHabitsDashboard(userId),
    safely(
      async () =>
        (
          await db
            .select({ n: count() })
            .from(workoutSets)
            .innerJoin(
              workoutExercises,
              eq(workoutSets.workoutExerciseId, workoutExercises.id),
            )
            .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
            .where(eq(workouts.userId, userId))
        )[0]?.n ?? 0,
      0,
      "set count",
    ),
    safely(
      async () => (await db.select({ n: count() }).from(exercises))[0]?.n ?? 0,
      0,
      "exercise library count",
    ),
    safely(
      async () =>
        (
          await db
            .select({ date: workouts.date })
            .from(workouts)
            .where(eq(workouts.userId, userId))
            .orderBy(desc(workouts.date))
            .limit(1)
        )[0]?.date ?? null,
      null as string | null,
      "last workout date",
    ),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Sessions logged"
          value={data.sessions.length || null}
          icon={BarbellIcon}
        />
        <MetricCard label="Sets recorded" value={setCount || null} />
        <MetricCard
          label="Exercise library"
          value={libraryCount || null}
          unit="movements"
          icon={ListMagnifyingGlassIcon}
          footnote="Browse them in Library"
        />
        <MetricCard
          label="Last session"
          value={lastDate ? formatShortDate(lastDate) : null}
        />
      </div>

      <WorkoutAiLogger />

      <Panel>
        <PanelHeader>
          <PanelTitle>Session history</PanelTitle>
        </PanelHeader>
        <PanelBody flush>
          <SessionHistory sessions={data.sessions} />
        </PanelBody>
      </Panel>
    </div>
  );
}
