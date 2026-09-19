import {
  BarbellIcon,
  ForkKnifeIcon,
  HeartbeatIcon,
  ListChecksIcon,
  NotePencilIcon,
  SparkleIcon,
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
    label: "Habits",
    icon: ListChecksIcon,
    description: "One day at a time — habits, weight, sessions",
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
    label: "Log",
    icon: NotePencilIcon,
    description: "Daily and weekly self-tracking questions",
  },
  {
    href: "/insights",
    label: "Insights",
    icon: SparkleIcon,
    description: "Patterns pulled out of the data",
  },
];

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
