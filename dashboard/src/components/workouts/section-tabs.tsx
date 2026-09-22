"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/workouts", label: "Log", exact: true },
  { href: "/workouts/library", label: "Library" },
];

export function WorkoutSectionTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Workout sections" className="-mb-2 border-b border-line">
      <ul className="flex items-end gap-1">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center px-3 pb-2.5 text-sm transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "font-medium text-text"
                    : "text-text-muted hover:text-text",
                )}
              >
                {tab.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-lime"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
