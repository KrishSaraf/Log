"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react";

import { todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-lime-line";

/**
 * Manual meal entry against the existing `meals` + `food_entries` shape
 * via `POST /api/nutrition/save-meal` (source: manual).
 */
export function ManualMealLogger({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [name, setName] = useState("");
  const [mealType, setMealType] =
    useState<(typeof MEAL_TYPES)[number]>("lunch");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const kcal = Number(calories);
      if (!Number.isFinite(kcal) || kcal < 0) {
        throw new Error("Enter calories for this meal.");
      }
      const title = name.trim() || mealType;
      const res = await fetch("/api/nutrition/save-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealName: title,
          mealType,
          source: "manual",
          foods: [
            {
              name: title,
              calories: kcal,
              proteinG: Number(protein) || 0,
              carbsG: Number(carbs) || 0,
              fatG: Number(fat) || 0,
            },
          ],
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Could not save meal.");
      setSaved(true);
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {!compact ? (
        <div>
          <h2 className="text-sm font-medium text-text">Log without a photo</h2>
          <p className="mt-1 text-sm text-text-muted">
            Same meal record as photo saves — name, type, and macros.
          </p>
        </div>
      ) : null}

      <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
        <label className="block text-xs font-medium text-text-muted">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
            required
          />
        </label>
        <label className="block text-xs font-medium text-text-muted">
          Type
          <select
            value={mealType}
            onChange={(e) =>
              setMealType(e.target.value as (typeof MEAL_TYPES)[number])
            }
            className={fieldClass}
          >
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs font-medium text-text-muted">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Chicken bowl"
          className={fieldClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block text-xs font-medium text-text-muted">
          Calories
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className={fieldClass}
            required
          />
        </label>
        <label className="block text-xs font-medium text-text-muted">
          Protein (g)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs font-medium text-text-muted">
          Carbs (g)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs font-medium text-text-muted">
          Fat (g)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-negative">{error}</p> : null}
      {saved ? <p className="text-sm text-lime">Meal saved.</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-lime px-4 text-sm font-medium text-on-lime transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? (
          <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
        ) : null}
        Save meal
      </button>
    </form>
  );
}
