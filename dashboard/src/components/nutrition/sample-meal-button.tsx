"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleNotchIcon, SparkleIcon } from "@phosphor-icons/react";

import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

const SAMPLE_FOODS = [
  {
    name: "Grilled chicken + rice",
    calories: 520,
    proteinG: 42,
    carbsG: 48,
    fatG: 14,
  },
];

/**
 * One-tap seed meal for empty nutrition states. Writes a real meal row —
 * not a fake preview.
 */
export function SampleMealButton({
  className,
  label = "Log a sample lunch",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/nutrition/save-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayIso(),
          mealName: "Sample chicken bowl",
          mealType: "lunch",
          source: "manual",
          foods: SAMPLE_FOODS,
          notes: "Sample meal to wake the nutrition rings",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Could not save sample.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime px-4 text-sm font-medium text-on-lime",
          "transition-opacity hover:opacity-90 disabled:opacity-50",
          className,
        )}
      >
        {busy ? (
          <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
        ) : (
          <SparkleIcon size={16} weight="fill" aria-hidden />
        )}
        {busy ? "Logging…" : label}
      </button>
      {error ? <p className="text-xs text-negative">{error}</p> : null}
    </div>
  );
}
