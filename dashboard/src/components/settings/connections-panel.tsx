"use client";

import * as React from "react";
import {
  AndroidLogoIcon,
  AppleLogoIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  FileArrowUpIcon,
  HeartbeatIcon,
  PlugsConnectedIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import type { ConnectionView } from "@/lib/connections";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ConnectionView["status"], string> = {
  disconnected: "Not connected",
  pending: "Connecting…",
  connected: "Connected",
  error: "Needs attention",
};

const PROVIDER_ICON: Record<ConnectionView["provider"], Icon> = {
  apple_health: AppleLogoIcon,
  health_connect: HeartbeatIcon,
  google_fit: AndroidLogoIcon,
  manual_import: FileArrowUpIcon,
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
      if (status === "connected") {
        const catalog = items.find((i) => i.provider === provider);
        if (catalog?.comingSoon) {
          setNotice(
            `${catalog.name} is marked ready on your account — native Android sync ships with the Expo client.`,
          );
        } else if (provider === "apple_health") {
          setNotice(
            "Apple Health is marked connected. Open Log on iPhone to sync rings into Today.",
          );
        } else if (!catalog?.hookAvailable) {
          setNotice(
            "Marked connected for planning — native sync for this source ships with the mobile client.",
          );
        } else {
          setNotice("Connection saved.");
        }
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  }

  const live = items.filter((i) => !i.comingSoon);
  const soon = items.filter((i) => i.comingSoon);

  return (
    <div className="space-y-6">
      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-lime-line bg-lime-quiet px-3 py-2.5 text-sm text-text animate-[reveal-up_280ms_var(--ease-out-quint)_both]"
        >
          {notice}
        </p>
      ) : null}

      <ConnectionGroup title="Available now" items={live} busy={busy} onStatus={setStatus} />
      {soon.length > 0 ? (
        <ConnectionGroup
          title="Coming soon"
          items={soon}
          busy={busy}
          onStatus={setStatus}
          muted
        />
      ) : null}
    </div>
  );
}

function ConnectionGroup({
  title,
  items,
  busy,
  onStatus,
  muted = false,
}: {
  title: string;
  items: ConnectionView[];
  busy: string | null;
  onStatus: (
    provider: ConnectionView["provider"],
    status: ConnectionView["status"],
  ) => void;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="label-caps px-1">{title}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <ConnectionCard
            key={item.provider}
            item={item}
            busy={busy === item.provider}
            muted={muted}
            onStatus={onStatus}
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </ul>
    </div>
  );
}

function ConnectionCard({
  item,
  busy,
  muted,
  onStatus,
  style,
}: {
  item: ConnectionView;
  busy: boolean;
  muted: boolean;
  onStatus: (
    provider: ConnectionView["provider"],
    status: ConnectionView["status"],
  ) => void;
  style?: React.CSSProperties;
}) {
  const Icon = PROVIDER_ICON[item.provider] ?? PlugsConnectedIcon;
  const connected = item.status === "connected";

  return (
    <li
      style={style}
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-line bg-surface-raised/40 p-4",
        "transition-[border-color,background-color,transform] duration-200",
        "animate-[reveal-up_320ms_var(--ease-out-quint)_both]",
        "hover:-translate-y-0.5 hover:border-lime-line/70",
        connected && "border-lime-line bg-lime-quiet/40",
        muted && !connected && "opacity-90",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border",
            connected
              ? "border-lime-line bg-lime text-on-lime"
              : "border-line bg-surface text-text-muted",
          )}
        >
          <Icon size={18} weight={connected ? "fill" : "duotone"} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-text">{item.name}</p>
            <StatusPill status={item.status} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">
            {item.description}
          </p>
          <p className="mt-2 text-xs text-text-faint">
            {item.platform === "ios"
              ? "Best on iPhone via HealthKit"
              : item.platform === "android"
                ? "Android · Health Connect path"
                : "Any device"}
            {item.lastSyncAt
              ? ` · Last sync ${new Date(item.lastSyncAt).toLocaleString()}`
              : ""}
          </p>
          {item.lastError ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-negative">
              <WarningCircleIcon size={12} aria-hidden />
              {item.lastError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {connected ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus(item.provider, "disconnected")}
            className="min-h-11 rounded-lg border border-line px-3 text-sm text-text-muted transition-colors hover:border-lime-line hover:text-text disabled:opacity-50"
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus(item.provider, "connected")}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium",
              "transition-opacity hover:opacity-90 disabled:opacity-50",
              item.comingSoon
                ? "border border-lime-line bg-transparent text-lime"
                : "bg-lime text-on-lime",
            )}
          >
            {busy ? (
              <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
            ) : (
              <PlugsConnectedIcon size={16} weight="bold" aria-hidden />
            )}
            {item.comingSoon
              ? "Enable stub"
              : item.hookAvailable
                ? "Connect"
                : "Enable placeholder"}
          </button>
        )}
      </div>
    </li>
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
            : "bg-surface text-text-faint",
      )}
    >
      {connected ? <CheckCircleIcon size={11} weight="fill" aria-hidden /> : null}
      {STATUS_LABEL[status]}
    </span>
  );
}
