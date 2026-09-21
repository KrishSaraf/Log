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
  XIcon,
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

const HC_SCOPES = [
  "Steps & activity",
  "Sleep sessions",
  "Heart rate",
  "Weight",
] as const;

function enableCopy(item: ConnectionView): {
  idle: string;
  pending: string;
  success: string;
} {
  if (item.provider === "health_connect") {
    return {
      idle: "Enable for Android",
      pending: "Preparing…",
      success:
        "Health Connect is marked on your account. Open Log on Android to grant scopes — steps, sleep, heart, and weight flow into the same hub tables.",
    };
  }
  if (item.provider === "google_fit") {
    return {
      idle: "Enable stub",
      pending: "Enabling…",
      success:
        "Google Fit marked for this account. Prefer Health Connect when available — Fit stays a fallback path.",
    };
  }
  if (item.provider === "apple_health") {
    return {
      idle: "Connect",
      pending: "Connecting…",
      success:
        "Apple Health is connected. Open Log on iPhone to sync rings, sleep, and vitals into Today.",
    };
  }
  return {
    idle: item.hookAvailable ? "Connect" : "Enable",
    pending: "Saving…",
    success: "Connection saved.",
  };
}

export function ConnectionsPanel({
  initial,
}: {
  initial: ConnectionView[];
}) {
  const [items, setItems] = React.useState(initial);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [justConnected, setJustConnected] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 5600);
    return () => window.clearTimeout(t);
  }, [notice]);

  React.useEffect(() => {
    if (!justConnected) return;
    const t = window.setTimeout(() => setJustConnected(null), 1600);
    return () => window.clearTimeout(t);
  }, [justConnected]);

  async function setStatus(
    provider: ConnectionView["provider"],
    status: ConnectionView["status"],
  ) {
    const catalog = items.find((i) => i.provider === provider);
    setBusy(provider);
    setNotice(null);

    // Optimistic pending pulse so enable feels responsive.
    if (status === "connected") {
      setItems((prev) =>
        prev.map((item) =>
          item.provider === provider
            ? { ...item, status: "pending" as const }
            : item,
        ),
      );
      await new Promise((r) => window.setTimeout(r, 320));
    }

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
      if (status === "connected" && catalog) {
        setJustConnected(provider);
        setNotice(enableCopy(catalog).success);
      } else if (status === "disconnected") {
        setNotice(`${catalog?.name ?? "Source"} disconnected.`);
      }
    } catch (err) {
      // Roll pending back on failure.
      setItems((prev) =>
        prev.map((item) =>
          item.provider === provider && item.status === "pending"
            ? { ...item, status: "disconnected" as const }
            : item,
        ),
      );
      setNotice(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  }

  const live = items.filter((i) => !i.comingSoon);
  const soon = items.filter((i) => i.comingSoon);
  const android = soon.filter((i) => i.platform === "android");
  const otherSoon = soon.filter((i) => i.platform !== "android");

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-lime-line bg-lime-quiet px-3.5 py-3 animate-[reveal-up_280ms_var(--ease-out-quint)_both]"
        >
          <CheckCircleIcon
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0 text-lime"
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-text">
            {notice}
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNotice(null)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <XIcon size={14} weight="bold" aria-hidden />
          </button>
        </div>
      ) : null}

      <ConnectionGroup
        title="Available now"
        items={live}
        busy={busy}
        justConnected={justConnected}
        onStatus={setStatus}
      />

      {android.length > 0 ? (
        <ConnectionGroup
          title="Android · Health Connect"
          subtitle="Mark intent on the hub now — Expo grants scopes on-device next."
          items={android}
          busy={busy}
          justConnected={justConnected}
          onStatus={setStatus}
          muted
          highlightHealthConnect
        />
      ) : null}

      {otherSoon.length > 0 ? (
        <ConnectionGroup
          title="Coming soon"
          items={otherSoon}
          busy={busy}
          justConnected={justConnected}
          onStatus={setStatus}
          muted
        />
      ) : null}
    </div>
  );
}

function ConnectionGroup({
  title,
  subtitle,
  items,
  busy,
  justConnected,
  onStatus,
  muted = false,
  highlightHealthConnect = false,
}: {
  title: string;
  subtitle?: string;
  items: ConnectionView[];
  busy: string | null;
  justConnected: string | null;
  onStatus: (
    provider: ConnectionView["provider"],
    status: ConnectionView["status"],
  ) => void;
  muted?: boolean;
  highlightHealthConnect?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="px-1">
        <p className="label-caps">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <ConnectionCard
            key={item.provider}
            item={item}
            busy={busy === item.provider}
            muted={muted}
            celebrate={justConnected === item.provider}
            showScopes={
              highlightHealthConnect && item.provider === "health_connect"
            }
            onStatus={onStatus}
            style={{ animationDelay: `${index * 55}ms` }}
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
  celebrate,
  showScopes,
  onStatus,
  style,
}: {
  item: ConnectionView;
  busy: boolean;
  muted: boolean;
  celebrate: boolean;
  showScopes: boolean;
  onStatus: (
    provider: ConnectionView["provider"],
    status: ConnectionView["status"],
  ) => void;
  style?: React.CSSProperties;
}) {
  const Icon = PROVIDER_ICON[item.provider] ?? PlugsConnectedIcon;
  const connected = item.status === "connected";
  const pending = item.status === "pending" || busy;
  const copy = enableCopy(item);

  return (
    <li
      style={style}
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-line bg-surface-raised/40 p-4",
        "transition-[border-color,background-color,transform,box-shadow] duration-300",
        "animate-[reveal-up_320ms_var(--ease-out-quint)_both]",
        "hover:-translate-y-0.5 hover:border-lime-line/70",
        connected && "border-lime-line bg-lime-quiet/40",
        celebrate && "shadow-[var(--lime-glow)]",
        muted && !connected && "opacity-95",
        item.provider === "health_connect" &&
          !connected &&
          "border-lime-line/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300",
            connected
              ? "border-lime-line bg-lime text-on-lime"
              : pending
                ? "border-lime-line bg-lime-quiet text-lime"
                : "border-line bg-surface text-text-muted",
            celebrate && "animate-[ring-breathe_1.2s_var(--ease-out-quint)_2]",
          )}
        >
          {pending && !connected ? (
            <CircleNotchIcon size={18} className="animate-spin" aria-hidden />
          ) : (
            <Icon
              size={18}
              weight={connected ? "fill" : "duotone"}
              aria-hidden
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-text">{item.name}</p>
            <StatusPill status={pending && !connected ? "pending" : item.status} />
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
          {showScopes ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {HC_SCOPES.map((scope) => (
                <li
                  key={scope}
                  className="rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-medium tracking-wide text-text-muted uppercase"
                >
                  {scope}
                </li>
              ))}
            </ul>
          ) : null}
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
          <>
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-lime-line bg-lime-quiet px-3 text-sm font-medium text-lime">
              <CheckCircleIcon size={15} weight="fill" aria-hidden />
              Enabled
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(item.provider, "disconnected")}
              className="min-h-11 rounded-lg border border-line px-3 text-sm text-text-muted transition-colors hover:border-lime-line hover:text-text disabled:opacity-50"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy || pending}
            onClick={() => onStatus(item.provider, "connected")}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg px-3.5 text-sm font-medium",
              "transition-[opacity,transform,background-color] duration-200",
              "hover:opacity-90 active:scale-[0.98] disabled:opacity-50",
              item.comingSoon || item.provider === "health_connect"
                ? "border border-lime-line bg-transparent text-lime hover:bg-lime-quiet"
                : "bg-lime text-on-lime",
            )}
          >
            {busy || pending ? (
              <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
            ) : (
              <PlugsConnectedIcon size={16} weight="bold" aria-hidden />
            )}
            {busy || pending ? copy.pending : copy.idle}
          </button>
        )}
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: ConnectionView["status"] }) {
  const connected = status === "connected";
  const pending = status === "pending";
  const errored = status === "error";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
        connected
          ? "bg-lime-quiet text-lime"
          : pending
            ? "bg-lime-quiet/70 text-lime"
            : errored
              ? "bg-negative/15 text-negative"
              : "bg-surface text-text-faint",
      )}
    >
      {connected ? (
        <CheckCircleIcon size={11} weight="fill" aria-hidden />
      ) : null}
      {STATUS_LABEL[status]}
    </span>
  );
}
