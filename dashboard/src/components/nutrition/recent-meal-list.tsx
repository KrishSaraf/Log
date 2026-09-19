"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatShortDate } from "@/lib/format";

type Meal = {
  id: string;
  date: string;
  name: string | null;
  mealType: string;
  calories: number;
};

export function RecentMealList({ meals }: { meals: Meal[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/nutrition/meals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul className="divide-y divide-line">
      {meals.map((meal) => (
        <li
          key={meal.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">
              {meal.name || "Meal"}
            </p>
            <p className="text-xs text-text-faint">
              {formatShortDate(meal.date)} · {meal.mealType}
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
              className="min-h-11 text-sm text-text-faint hover:text-negative disabled:opacity-40"
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
