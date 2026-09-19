"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/shell/brand";
import { isActivePath, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-30 hidden w-54 flex-col border-r border-line bg-surface-sunken lg:flex"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-line px-4">
        <Brand />
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.description}
                className={cn(
                  "relative flex min-h-11 items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-surface-raised font-medium text-text"
                    : "text-text-muted hover:bg-white/[0.03] hover:text-text",
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-ember"
                  />
                ) : null}
                <Icon
                  size={17}
                  weight={active ? "fill" : "regular"}
                  className={cn("shrink-0", active ? "text-ember" : "text-text-faint")}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Below lg the sidebar is replaced by a sticky bar with a scrollable row of
 * section pills. No drawer, so navigation stays one tap away.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
      <div className="flex h-12 items-center px-4">
        <Brand />
      </div>
      <nav aria-label="Primary" className="no-scrollbar overflow-x-auto px-3 pb-2">
        <ul className="flex w-max items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors duration-150",
                    active
                      ? "border-ember-line bg-ember-quiet font-medium text-text"
                      : "border-line text-text-muted hover:text-text",
                  )}
                >
                  <Icon
                    size={16}
                    weight={active ? "fill" : "regular"}
                    className={active ? "text-ember" : "text-text-faint"}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
