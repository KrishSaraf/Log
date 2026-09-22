import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ListChecksIcon, NotePencilIcon } from "@phosphor-icons/react/dist/ssr";

import { HabitChainBoard } from "@/components/habits/habit-chain";
import { SeedHabitsButton } from "@/components/habits/seed-habits-button";
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
  const noHabits =
    data.activeQuestions.length === 0 && data.questions.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Log"
        description="Each habit is a chain of days. Tap to fill the ones you did."
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
                description="Seed the default set with a lived-in week, or add habits when you are ready."
                action={<SeedHabitsButton />}
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
                size="compact"
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
            <PanelTitle>Every habit</PanelTitle>
            <PanelDescription>
              {data.daysLogged === 0
                ? "Each square is a day. Tap to fill it."
                : `${data.daysLogged} days logged`}
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody>
          {noHabits ? (
            <EmptyState
              icon={ListChecksIcon}
              title="No days yet"
              description="Seed demo habits to see chains light up — or mark one when you are ready."
              action={<SeedHabitsButton label="Seed demo week" />}
            />
          ) : (
            <HabitChainBoard
              questions={data.questions}
              ranges={data.ranges}
              weekCount={52}
            />
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
