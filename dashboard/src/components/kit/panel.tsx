import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Panel is the one surface primitive in this app. Everything that needs to
 * read as a bounded region uses it: a hairline border on --surface, radius-lg,
 * never a drop shadow. shadcn's Card exists in the repo but is not used for
 * dashboard regions, so the surface language stays uniform.
 */
function Panel({
  className,
  inset = false,
  ...props
}: React.ComponentProps<"section"> & { inset?: boolean }) {
  return (
    <section
      data-slot="panel"
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-line bg-surface",
        inset && "bg-surface-sunken",
        className,
      )}
      {...props}
    />
  );
}

function PanelHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="panel-header"
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-2.5",
        className,
      )}
      {...props}
    />
  );
}

function PanelTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="panel-title"
      className={cn(
        "font-display truncate text-sm font-semibold tracking-tight text-text",
        className,
      )}
      {...props}
    />
  );
}

function PanelDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="panel-description"
      className={cn("text-xs text-text-muted", className)}
      {...props}
    />
  );
}

/** Right-hand slot of a PanelHeader: filters, links, small buttons. */
function PanelActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-actions"
      className={cn("flex shrink-0 items-center gap-1.5", className)}
      {...props}
    />
  );
}

function PanelBody({
  className,
  flush = false,
  ...props
}: React.ComponentProps<"div"> & { flush?: boolean }) {
  return (
    <div
      data-slot="panel-body"
      className={cn("min-w-0 flex-1", flush ? "p-0" : "p-4", className)}
      {...props}
    />
  );
}

function PanelFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="panel-footer"
      className={cn(
        "flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-text-muted",
        className,
      )}
      {...props}
    />
  );
}

export {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelDescription,
  PanelActions,
  PanelBody,
  PanelFooter,
};
