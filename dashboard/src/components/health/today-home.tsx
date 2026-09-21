import Link from "next/link";
import {
  BarbellIcon,
  BooksIcon,
  DropIcon,
  ForkKnifeIcon,
  HeartbeatIcon,
  ListChecksIcon,
  MoonIcon,
  PlugsConnectedIcon,
  PulseIcon,
  ScalesIcon,
  SmileyIcon,
} from "@phosphor-icons/react/dist/ssr";

import { ActivityRings } from "@/components/health/activity-rings";
import { QuickLog } from "@/components/health/quick-log";
import { ManualMealLogger } from "@/components/nutrition/manual-meal-logger";
import { NutritionRings } from "@/components/nutrition/nutrition-rings";
import { RecentMealList } from "@/components/nutrition/recent-meal-list";
import {
  EmptyState,
  MetricCard,
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from "@/components/kit";
import {
  formatDuration,
  formatKg,
  formatLongDate,
  formatShortDate,
} from "@/lib/format";
import { NUTRITION_GOALS } from "@/lib/nutrition";
import type { TodaySummary } from "@/lib/today";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  {
    href: "/workouts",
    label: "Log workout",
    description: "Sessions",
    icon: BarbellIcon,
  },
  {
    href: "/workouts/library",
    label: "Exercise library",
    description: "Movements",
    icon: BooksIcon,
  },
  {
    href: "/nutrition",
    label: "Snap a meal",
    description: "Photo log",
    icon: ForkKnifeIcon,
  },
  {
    href: "/health",
    label: "Trends",
    description: "History",
    icon: HeartbeatIcon,
  },
  {
    href: "/log",
    label: "Habits",
    description: "Daily ticks",
    icon: ListChecksIcon,
  },
  {
    href: "/settings/connections",
    label: "Connections",
    description: "Sources",
    icon: PlugsConnectedIcon,
  },
] as const;

const KIND_LABEL: Record<TodaySummary["recent"][number]["kind"], string> = {
  workout: "Workout",
  meal: "Meal",
  sleep: "Sleep",
};

function greetingForHour(hour: number) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Tonight";
}

export function TodayHome({ summary }: { summary: TodaySummary }) {
  const { metrics, rings, recent, connectedCount, nutrition } = summary;
  const hasActivity =
    metrics.activeCalories !== null ||
    metrics.exerciseMinutes !== null ||
    metrics.standHours !== null;
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);

  const bp =
    metrics.bpSystolic != null && metrics.bpDiastolic != null
      ? `${Math.round(metrics.bpSystolic)}/${Math.round(metrics.bpDiastolic)}`
      : null;

  return (
    <div className="space-y-8">
      <header className="reveal space-y-2">
        <p className="label-caps text-lime">{greeting}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Today
        </h1>
        <p className="text-sm text-text-muted">{formatLongDate(summary.date)}</p>
      </header>

      {/* Hero: activity + nutrition as one composition */}
      <section
        aria-label="Today summary"
        className="reveal reveal-delay-1 grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <Panel className="overflow-hidden">
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Activity</PanelTitle>
              <PanelDescription>Move · Exercise · Stand</PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <div className="ring-glow">
                <ActivityRings
                  move={rings.move}
                  exercise={rings.exercise}
                  stand={rings.stand}
                  size={148}
                />
              </div>
              <ul className="w-full min-w-0 space-y-3 text-sm">
                <RingStat
                  label="Move"
                  value={
                    metrics.activeCalories !== null
                      ? `${Math.round(metrics.activeCalories)}`
                      : null
                  }
                  unit="kcal"
                  tone="text-lime"
                />
                <RingStat
                  label="Exercise"
                  value={
                    metrics.exerciseMinutes !== null
                      ? `${Math.round(metrics.exerciseMinutes)}`
                      : null
                  }
                  unit="min"
                  tone="text-[#8fd14f]"
                />
                <RingStat
                  label="Stand"
                  value={
                    metrics.standHours !== null
                      ? `${Math.round(metrics.standHours * 10) / 10}`
                      : null
                  }
                  unit="hr"
                  tone="text-[#6ec8e0]"
                />
              </ul>
            </div>
            {!hasActivity ? (
              <p className="mt-4 text-xs text-text-faint">
                Connect Apple Health to fill these automatically — or log
                vitals below.
              </p>
            ) : null}
          </PanelBody>
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Nutrition</PanelTitle>
              <PanelDescription>
                Soft targets {NUTRITION_GOALS.calories} kcal ·{" "}
                {NUTRITION_GOALS.proteinG}g protein
              </PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <NutritionRings
                calories={nutrition.rings.calories}
                protein={nutrition.rings.protein}
                size={148}
              />
              <ul className="w-full min-w-0 space-y-3 text-sm">
                <RingStat
                  label="Calories"
                  value={
                    nutrition.caloriesToday
                      ? `${Math.round(nutrition.caloriesToday)}`
                      : null
                  }
                  unit="kcal"
                  tone="text-lime"
                />
                <RingStat
                  label="Protein"
                  value={
                    nutrition.proteinToday
                      ? `${Math.round(nutrition.proteinToday)}`
                      : null
                  }
                  unit="g"
                  tone="text-[#8fd14f]"
                />
                <RingStat
                  label="Meals"
                  value={
                    nutrition.mealsToday ? `${nutrition.mealsToday}` : null
                  }
                  unit="today"
                  tone="text-text-muted"
                />
              </ul>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/nutrition"
                className="inline-flex min-h-11 items-center rounded-lg bg-lime px-4 text-sm font-medium text-on-lime transition-opacity hover:opacity-90"
              >
                Snap a meal
              </Link>
              <Link
                href="/nutrition"
                className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm text-text-muted transition-colors hover:border-lime-line hover:text-text"
              >
                Full nutrition
              </Link>
            </div>
          </PanelBody>
        </Panel>
      </section>

      <section
        aria-label="Vitals"
        className="reveal reveal-delay-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        <MetricCard
          label="Steps"
          value={metrics.steps !== null ? Math.round(metrics.steps) : null}
          icon={PulseIcon}
        />
        <MetricCard
          label="Sleep"
          value={
            metrics.sleepMinutes !== null
              ? formatDuration(metrics.sleepMinutes)
              : null
          }
          icon={MoonIcon}
        />
        <MetricCard
          label="Water"
          value={
            metrics.waterMl !== null
              ? (metrics.waterMl / 1000).toFixed(1)
              : null
          }
          unit="L"
          icon={DropIcon}
        />
        <MetricCard
          label="Resting HR"
          value={
            metrics.restingHeartRate !== null
              ? Math.round(metrics.restingHeartRate)
              : null
          }
          unit="bpm"
          icon={HeartbeatIcon}
        />
        <MetricCard
          label="Weight"
          value={metrics.weightKg !== null ? formatKg(metrics.weightKg) : null}
          unit="kg"
          icon={ScalesIcon}
        />
        <MetricCard
          label="Blood pressure"
          value={bp}
          unit={bp ? "mmHg" : undefined}
          icon={HeartbeatIcon}
        />
        <MetricCard
          label="Mood"
          value={metrics.mood !== null ? Math.round(metrics.mood) : null}
          unit="/5"
          icon={SmileyIcon}
        />
        <MetricCard
          label="Energy"
          value={metrics.energy !== null ? Math.round(metrics.energy) : null}
          unit="/5"
          icon={PulseIcon}
        />
      </section>

      <section
        aria-label="Shortcuts"
        className="reveal reveal-delay-2"
      >
        <h2 className="label-caps mb-3">Shortcuts</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {SHORTCUTS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-20 flex-col justify-between rounded-lg border border-line bg-surface/80 p-3 backdrop-blur-sm",
                    "transition-all duration-200 hover:border-lime-line hover:bg-surface-raised",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  )}
                >
                  <Icon
                    size={18}
                    className="text-lime"
                    weight="duotone"
                    aria-hidden
                  />
                  <span>
                    <span className="block text-sm font-medium text-text">
                      {item.label}
                    </span>
                    <span className="block text-xs text-text-faint">
                      {item.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="reveal reveal-delay-3 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Log a meal</PanelTitle>
              <PanelDescription>
                Manual path into hub.meals + food_entries
              </PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <ManualMealLogger compact />
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Sources</PanelTitle>
              <PanelDescription>
                {connectedCount === 0
                  ? "No connections yet"
                  : `${connectedCount} connected`}
              </PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <p className="text-sm leading-relaxed text-text-muted">
              Pull activity, vitals, and sleep from Apple Health, Health
              Connect, or Google Fit.
            </p>
            <Link
              href="/settings/connections"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-lime px-4 text-sm font-medium text-on-lime transition-opacity hover:opacity-90"
            >
              Manage connections
            </Link>
          </PanelBody>
        </Panel>
      </div>

      <Panel className="reveal reveal-delay-3">
        <PanelHeader>
          <div className="min-w-0">
            <PanelTitle>Recent meals</PanelTitle>
            <PanelDescription>Same list as Nutrition</PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody flush>
          {nutrition.recent.length === 0 ? (
            <EmptyState
              icon={ForkKnifeIcon}
              title="No meals yet"
              description="Snap a plate or log macros — both use the dashboard nutrition model."
              action={
                <Link
                  href="/nutrition"
                  className="inline-flex min-h-11 items-center rounded-lg bg-lime px-4 text-sm font-medium text-on-lime"
                >
                  Open nutrition
                </Link>
              }
            />
          ) : (
            <RecentMealList
              meals={nutrition.recent.map((meal) => ({
                id: meal.id,
                date: meal.date,
                name: meal.name,
                mealType: meal.mealType,
                calories: meal.calories,
                protein: meal.protein,
              }))}
            />
          )}
        </PanelBody>
      </Panel>

      <Panel className="reveal reveal-delay-4">
        <PanelHeader>
          <div className="min-w-0">
            <PanelTitle>Log vitals</PanelTitle>
            <PanelDescription>
              Weight, sleep, water, heart, mood — into health_metrics
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody>
          <QuickLog
            defaults={{
              weightKg: metrics.weightKg,
              waterMl: metrics.waterMl,
              restingHeartRate: metrics.restingHeartRate,
              bpSystolic: metrics.bpSystolic,
              bpDiastolic: metrics.bpDiastolic,
              mood: metrics.mood,
              energy: metrics.energy,
              sleepMinutes: metrics.sleepMinutes,
            }}
          />
        </PanelBody>
      </Panel>

      <div className="reveal reveal-delay-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Recent activity</PanelTitle>
              <PanelDescription>Workouts, meals, and sleep</PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody flush>
            {recent.length === 0 ? (
              <EmptyState
                icon={PulseIcon}
                title="Nothing logged yet"
                description="Sessions, meals, and sleep nights will show up here."
              />
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-text">{item.title}</p>
                      <p className="truncate text-xs text-text-faint">
                        {KIND_LABEL[item.kind]}
                        {item.subtitle ? ` · ${item.subtitle}` : ""}
                      </p>
                    </div>
                    <span className="num shrink-0 text-xs text-text-muted">
                      {formatShortDate(item.date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-4">
          <PanelHeader>
            <PanelTitle>Workouts</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <p className="text-sm text-text-muted">
              Strength sessions and the exercise library stay one module —
              never the whole product.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/workouts"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-lime-line bg-lime-quiet px-4 text-sm font-medium text-text"
              >
                Log workout
              </Link>
              <Link
                href="/workouts/library"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm text-text-muted hover:text-text"
              >
                Exercise library
              </Link>
            </div>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function RingStat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string | null;
  unit: string;
  tone: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className={cn("text-xs font-medium", tone)}>{label}</span>
      {value !== null ? (
        <span className="num text-sm text-text">
          {value}
          <span className="ml-1 text-xs text-text-faint">{unit}</span>
        </span>
      ) : (
        <span className="text-xs text-text-faint">—</span>
      )}
    </li>
  );
}
