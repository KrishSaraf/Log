import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ListChecksIcon, NotePencilIcon } from "@phosphor-icons/react/dist/ssr";

import { auth } from "@/auth";
import {
  EmptyState,
  PageHeader,
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from "@/components/kit";
import { habitCompletion, loadHabitsDashboard } from "@/lib/habits";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Log" };

export default async function LogPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const data = await loadHabitsDashboard(session.user.id);

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
    </div>
  );
}
