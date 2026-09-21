"use client";

import * as React from "react";
import {
  CheckCircleIcon,
  CircleNotchIcon,
  PlugsConnectedIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import type { ConnectionView } from "@/lib/connections";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ConnectionView["status"], string> = {
  disconnected: "Not connected",
  pending: "Connecting…",
  connected: "Connected",
  error: "Needs attention",
};

export function ConnectionsPanel({
  initial,
}: {
  initial: ConnectionView[];
}) {
  const [items, setItems] = React.useState(initial);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function setStatus(
    provider: ConnectionView["provider"],
    status: ConnectionView["status"],
  ) {
    setBusy(provider);
    setNotice(null);
    try {
      const res = await fetch("/api/settings/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "Could not update connection.");
      }
      const row = (await res.json()) as ConnectionView;
      setItems((prev) =>
        prev.map((item) =>
          item.provider === provider
            ? {
                ...item,
                status: row.status,
                lastSyncAt: row.lastSyncAt,
                lastError: row.lastError,
                displayName: row.displayName,
                rowId: row.rowId,
              }
            : item,
        ),
      );
      if (status === "connected" && !items.find((i) => i.provider === provider)?.hookAvailable) {
        setNotice(
          "Marked connected for planning — native sync for this source ships with the mobile client.",
        );
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <p className="rounded-lg border border-lime-line bg-lime-quiet px-3 py-2 text-sm text-text">
          {notice}
        </p>
      ) : null}

      <ul className="divide-y divide-line">
        {items.map((item) => {
          const isBusy = busy === item.provider;
          const connected = item.status === "connected";
          return (
            <li
              key={item.provider}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-text">{item.name}</p>
                  <StatusPill status={item.status} />
                  {item.comingSoon ? (
                    <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] tracking-wide text-text-faint uppercase">
                      Coming soon
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-text-muted">{item.description}</p>
                <p className="mt-1 text-xs text-text-faint">
                  {item.platform === "ios"
                    ? "Best on iPhone via HealthKit"
                    : item.platform === "android"
                      ? "Android"
                      : "Any device"}
                  {item.lastSyncAt
                    ? ` · Last sync ${new Date(item.lastSyncAt).toLocaleString()}`
                    : ""}
                </p>
                {item.lastError ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-negative">
                    <WarningCircleIcon size={12} aria-hidden />
                    {item.lastError}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {connected ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setStatus(item.provider, "disconnected")}
                    className="min-h-11 rounded-lg border border-line px-3 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setStatus(item.provider, "connected")}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime px-3 text-sm font-medium text-on-lime",
                      "transition-opacity hover:opacity-90 disabled:opacity-50",
                    )}
                  >
                    {isBusy ? (
                      <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
                    ) : (
                      <PlugsConnectedIcon size={16} weight="bold" aria-hidden />
                    )}
                    {item.hookAvailable ? "Connect" : "Enable placeholder"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: ConnectionView["status"] }) {
  const connected = status === "connected";
  const errored = status === "error";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        connected
          ? "bg-lime-quiet text-lime"
          : errored
            ? "bg-negative/15 text-negative"
            : "bg-surface-raised text-text-faint",
      )}
    >
      {connected ? <CheckCircleIcon size={11} weight="fill" aria-hidden /> : null}
      {STATUS_LABEL[status]}
    </span>
  );
}
