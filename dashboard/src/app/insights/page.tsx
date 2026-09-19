import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import {
  EmptyState,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
} from "@/components/kit";
import { db, insights } from "@/db";
import { formatShortDate } from "@/lib/format";
import { safely } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;

  const rows = await safely(
    () =>
      db
        .select({
          id: insights.id,
          date: insights.date,
          title: insights.title,
          body: insights.body,
          kind: insights.kind,
        })
        .from(insights)
        .where(eq(insights.userId, userId))
        .orderBy(desc(insights.date))
        .limit(20),
    [] as {
      id: string;
      date: string;
      title: string;
      body: string | null;
      kind: string;
    }[],
    "insights",
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Insights"
        description="Observations drawn from training, food, sleep and the daily log once there is enough history to compare."
      />

      <Panel>
        <PanelHeader>
          <PanelTitle>Recent</PanelTitle>
        </PanelHeader>
        <PanelBody flush>
          {rows.length === 0 ? (
            <EmptyState
              icon={SparkleIcon}
              title="Nothing to report yet"
              description="Insights need a few weeks of overlapping data. Keep logging workouts, meals and daily answers and they will start appearing."
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((row) => (
                <li key={row.id} className="space-y-1 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium text-text">{row.title}</p>
                    <span className="num shrink-0 text-xs text-text-faint">
                      {formatShortDate(row.date)}
                    </span>
                  </div>
                  {row.body ? (
                    <p className="text-xs leading-relaxed text-text-muted">{row.body}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
