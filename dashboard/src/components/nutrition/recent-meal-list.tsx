"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Meal = {
  id: string;
  date: string;
  name: string | null;
  mealType: string;
  calories: number;
  protein?: number;
};

export function RecentMealList({ meals }: { meals: Meal[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    setLeavingId(id);
    try {
      const res = await fetch(`/api/nutrition/meals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove");
      // Brief exit beat before refresh so the row doesn't just vanish.
      await new Promise((r) => setTimeout(r, 180));
      router.refresh();
    } catch {
      setLeavingId(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul className="divide-y divide-line">
      {meals.map((meal) => (
        <li
          key={meal.id}
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3 transition-all duration-200",
            leavingId === meal.id && "translate-x-1 opacity-40",
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">
              {meal.name || "Meal"}
            </p>
            <p className="text-xs text-text-faint">
              <span className="capitalize">{meal.mealType}</span>
              {" · "}
              {formatShortDate(meal.date)}
              {meal.protein != null && meal.protein > 0
                ? ` · P ${Math.round(meal.protein)}g`
                : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <p className="num text-sm text-text-muted">
              {Math.round(meal.calories)} kcal
            </p>
            <button
              type="button"
              onClick={() => void remove(meal.id)}
              disabled={busyId === meal.id}
              className="min-h-11 rounded-md px-2 text-sm text-text-faint transition-colors hover:bg-surface-raised hover:text-negative disabled:opacity-40"
              aria-label={`Remove ${meal.name || "meal"}`}
            >
              {busyId === meal.id ? "…" : "Remove"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
