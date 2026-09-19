import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The single h1 of a page. Title, one line of context, and an optional
 * action cluster on the right.
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: {
  title: string;
  /** Small caps line above the title. At most one per page. */
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="label-caps mb-1.5">{eyebrow}</p> : null}
        <h1 className="text-xl font-medium tracking-tight text-text">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
