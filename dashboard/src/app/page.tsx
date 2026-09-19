import { redirect } from "next/navigation";

import { DayHabitView } from "@/components/habits/day-habit-view";
import { WeightTrend } from "@/components/health/weight-trend";
import {
  EmptyState,
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from "@/components/kit";
import { auth } from "@/auth";
import { CHART_HEIGHT } from "@/lib/chart-theme";
import { formatShortDate } from "@/lib/format";
import { loadHabitsDashboard } from "@/lib/habits";
import { ChartLineIcon } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export const metadata = { title: "Today" };

export default async function HabitsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const data = await loadHabitsDashboard(session.user.id);
  const mainRange = data.ranges.find((range) => range.days.length > 30);
  const trendWeights = mainRange
    ? data.weights.filter(
        (point) => point.date >= mainRange.start && point.date <= mainRange.end,
      )
    : data.weights;

  if (
    data.activeQuestions.length === 0 &&
    data.weights.length === 0 &&
    data.sessions.length === 0
  ) {
    return (
      <EmptyState
        icon={ChartLineIcon}
        title="Nothing here yet"
        description="Once you start marking days, they show up here one day at a time."
      />
    );
  }

  return (
    <div className="space-y-10">
      <DayHabitView
        questions={data.activeQuestions}
        ranges={data.ranges}
        weights={data.weights}
        sessions={data.sessions}
      />

      <Panel>
        <PanelHeader>
          <div className="min-w-0">
            <PanelTitle>Weight over time</PanelTitle>
            <PanelDescription>
              {trendWeights.length > 1
                ? `${formatShortDate(trendWeights[0].date)} – ${formatShortDate(trendWeights[trendWeights.length - 1].date)}`
                : "Body weight"}
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody>
          <WeightTrend points={trendWeights} height={CHART_HEIGHT.compact} />
        </PanelBody>
      </Panel>
    </div>
  );
}
