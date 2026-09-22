"use client";

import { CircleNotchIcon, SparkleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** One-tap demo seed for Log / empty habit boards. */
export function SeedHabitsButton({
  label = "Seed demo habits",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function seed() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/habits/seed-demo", { method: "POST" });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        inserted?: number;
      } | null;
      if (!res.ok) throw new Error(body?.error || "Could not seed habits.");
      setNote(
        body?.inserted
          ? `Loaded ${body.inserted} demo ticks.`
          : "Habits ready.",
      );
      router.refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Seed failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void seed()}
        className={
          className ??
          "inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime px-4 text-sm font-medium text-on-lime transition-opacity hover:opacity-90 disabled:opacity-60"
        }
      >
        {busy ? (
          <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
        ) : (
          <SparkleIcon size={16} weight="fill" aria-hidden />
        )}
        {busy ? "Seeding…" : label}
      </button>
      {note ? <p className="text-xs text-text-muted">{note}</p> : null}
    </div>
  );
}
