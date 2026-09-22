import {
  BarbellIcon,
  BooksIcon,
  ForkKnifeIcon,
  HeartbeatIcon,
  ListChecksIcon,
  PlugsConnectedIcon,
  SparkleIcon,
  SunIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

export type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  /** Shown under the label in the mobile drawer and as the tooltip on desktop. */
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Today",
    icon: SunIcon,
    description: "Activity rings, recent logs, and shortcuts",
  },
  {
    href: "/workouts",
    label: "Workouts",
    icon: BarbellIcon,
    description: "Logged sessions and the exercise library",
  },
  {
    href: "/nutrition",
    label: "Nutrition",
    icon: ForkKnifeIcon,
    description: "Meals, foods and macros",
  },
  {
    href: "/health",
    label: "Health",
    icon: HeartbeatIcon,
    description: "Body and activity metrics over time",
  },
  {
    href: "/log",
    label: "Habits",
    icon: ListChecksIcon,
    description: "Daily and weekly self-tracking questions",
  },
  {
    href: "/insights",
    label: "Insights",
    icon: SparkleIcon,
    description: "Patterns pulled out of the data",
  },
  {
    href: "/settings/connections",
    label: "Connections",
    icon: PlugsConnectedIcon,
    description: "HealthKit, Health Connect, and other sources",
  },
];

/** Secondary chrome links (not in the primary rail). */
export const SECONDARY_NAV: NavItem[] = [
  {
    href: "/workouts/library",
    label: "Exercise library",
    icon: BooksIcon,
    description: "Browse movements and form media",
  },
];

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
