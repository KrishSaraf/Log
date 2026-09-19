import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ListChecksIcon, NotePencilIcon } from "@phosphor-icons/react/dist/ssr";

import { HabitGrid } from "@/components/habits/habit-grid";
import {
  EmptyState,
  PageHeader,
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from "@/components/kit";
import { getDashboardUserId } from "@/lib/auth-user";
import { habitCompletion, loadHabitsDashboard } from "@/lib/habits";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Log" };

export default async function LogPage() {
  const userId = await getDashboardUserId();
  if (!userId) redirect("/sign-in");

  const data = await loadHabitsDashboard(userId);
  const loggedRanges = data.ranges
    .map((range) => ({
      ...range,
      days: range.days.filter(
        (day) => day.weightKg !== null || Object.keys(day.cells).length > 0,
      ),
    }))
    .filter((range) => range.days.length > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Log"
        description="The habits you track, and how often they get marked done."
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Habits</PanelTitle>
              <PanelDescription>Active set, in the order you use them</PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody flush>
            {data.activeQuestions.length === 0 ? (
              <EmptyState
                icon={NotePencilIcon}
                title="No habits yet"
                description="Add the things worth tracking and they will appear here."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.activeQuestions.map((question) => {
                  const { logged, done } = habitCompletion(data, question.key);
                  return (
                    <li
                      key={question.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="truncate text-sm text-text">{question.label}</span>
                      <span className="num shrink-0 text-xs text-text-muted">
                        {logged === 0 ? "No days yet" : `${done} of ${logged}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader>
            <PanelTitle>Earlier habits</PanelTitle>
          </PanelHeader>
          <PanelBody flush>
            {data.questions.filter((q) => !q.isActive).length === 0 ? (
              <EmptyState
                icon={ListChecksIcon}
                title="Nothing set aside"
                description="Habits you stop tracking will stay here so older days still make sense."
              />
            ) : (
              <ul className="divide-y divide-line">
                {data.questions
                  .filter((question) => !question.isActive)
                  .map((question) => {
                    const { logged, done } = habitCompletion(data, question.key);
                    return (
                      <li
                        key={question.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="truncate text-sm text-text">{question.label}</span>
                        <span className="num shrink-0 text-xs text-text-muted">
                          {logged === 0 ? "No days" : `${done} of ${logged}`}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader>
          <div className="min-w-0">
            <PanelTitle>Every logged day</PanelTitle>
            <PanelDescription>
              {data.daysLogged === 0
                ? "Days with a habit or weigh-in"
                : `${data.daysLogged} days`}
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody>
          {loggedRanges.length === 0 ? (
            <EmptyState
              icon={ListChecksIcon}
              title="No days yet"
              description="Mark a habit and the day will appear here."
            />
          ) : (
            <HabitGrid questions={data.questions} ranges={loggedRanges} />
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
