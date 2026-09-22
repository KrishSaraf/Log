import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr";

import { HabitChainBoard } from "@/components/habits/habit-chain";
import { SeedHabitsButton } from "@/components/habits/seed-habits-button";
import { EmptyState, PageHeader } from "@/components/kit";
import { getDashboardUserId } from "@/lib/auth-user";
import { loadHabitsDashboard } from "@/lib/habits";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Habits" };

export default async function LogPage() {
  const userId = await getDashboardUserId();
  if (!userId) redirect("/sign-in");

  const data = await loadHabitsDashboard(userId);
  const active = data.activeQuestions;
  const parked = data.questions.filter((question) => !question.isActive);
  const noHabits = active.length === 0 && data.questions.length === 0;

  return (
    <div className="relative space-y-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 right-0 left-0 -z-10 h-56 bg-[radial-gradient(ellipse_at_top,rgba(198,241,53,0.09),transparent_65%)]"
      />

      {noHabits || active.length === 0 ? (
        <>
          <PageHeader
            title="Habits"
            description="Mark the days you did them."
          />
          <EmptyState
            icon={ListChecksIcon}
            title="No habits yet"
            description="Start a set and mark the days you do them."
            action={<SeedHabitsButton />}
          />
        </>
      ) : (
        <HabitChainBoard questions={active} ranges={data.ranges} />
      )}

      {parked.length > 0 ? (
        <div className="space-y-3">
          <h2 className="label-caps text-text-muted">Set aside</h2>
          <HabitChainBoard
            questions={parked}
            ranges={data.ranges}
            weekCount={16}
            muted
          />
        </div>
      ) : null}
    </div>
  );
}
