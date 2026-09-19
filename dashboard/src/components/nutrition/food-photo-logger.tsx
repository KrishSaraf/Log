"use client";

import { CameraIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { prepareImageFile } from "@/lib/client/prepare-image";
import { cn } from "@/lib/utils";

type FoodDraft = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  confidence?: number;
  notes?: string | null;
};

type MealDraft = {
  mealName?: string | null;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  foods: FoodDraft[];
  assumptions?: string[];
  overallConfidence?: number;
};

function sum(foods: FoodDraft[], key: keyof FoodDraft) {
  return foods.reduce((acc, food) => {
    const n = food[key];
    return acc + (typeof n === "number" && Number.isFinite(n) ? n : 0);
  }, 0);
}

export function FoodPhotoLogger() {
  const router = useRouter();
  const [hint, setHint] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const totals = useMemo(() => {
    if (!draft) return null;
    return {
      calories: Math.round(sum(draft.foods, "calories")),
      protein: Math.round(sum(draft.foods, "proteinG")),
      carbs: Math.round(sum(draft.foods, "carbsG")),
      fat: Math.round(sum(draft.foods, "fatG")),
    };
  }, [draft]);

  async function onPick(file: File | null) {
    if (!file) return;
    setError(null);
    setSaved(false);
    setDraft(null);
    setBusy("analyze");
    let previewUrl: string | null = null;
    try {
      const prepared = await prepareImageFile(file);
      previewUrl = URL.createObjectURL(prepared);
      setPreview(previewUrl);
      const form = new FormData();
      form.append("image", prepared, "meal.jpg");
      if (hint.trim()) form.append("hint", hint.trim());
      const res = await fetch("/api/nutrition/analyze-photo", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onSave() {
    if (!draft) return;
    setBusy("save");
    setError(null);
    try {
      const res = await fetch("/api/nutrition/save-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealName: draft.mealName,
          mealType: draft.mealType,
          foods: draft.foods,
          notes: draft.assumptions?.join(" · ") || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-text">Snap a meal</h2>
            <p className="mt-1 text-sm text-text-muted">
              Photo the plate. AI estimates calories and macros — you confirm before it saves.
            </p>
          </div>
          <label
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-ember px-4 py-2.5 text-sm font-medium text-on-ember transition-opacity",
              busy && "pointer-events-none opacity-60",
            )}
          >
            {busy === "analyze" ? (
              <SpinnerGapIcon size={16} className="animate-spin" />
            ) : (
              <CameraIcon size={16} weight="bold" />
            )}
            {busy === "analyze" ? "Reading…" : "Choose photo"}
            <input
              type="file"
              accept="image/*,image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="label-caps">Optional note</span>
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="e.g. leftover pasta, one plate"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-ember-line"
          />
        </label>

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Meal preview"
            className="mt-4 max-h-56 w-full rounded-xl object-cover"
          />
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
        </p>
      ) : null}

      {draft ? (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="label-caps">Estimated meal</p>
              <h3 className="mt-1 text-lg font-medium text-text">
                {draft.mealName || "Meal"}
              </h3>
            </div>
            {totals ? (
              <p className="num text-sm text-text-muted">
                {totals.calories} kcal · P {totals.protein}g · C {totals.carbs}g · F{" "}
                {totals.fat}g
              </p>
            ) : null}
          </div>

          <ul className="divide-y divide-line rounded-xl border border-line">
            {draft.foods.map((food, i) => (
              <li key={`${food.name}-${i}`} className="flex items-start justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{food.name}</p>
                  <p className="mt-0.5 text-xs text-text-faint">
                    {[food.quantity, food.unit].filter(Boolean).join(" ") || "portion estimate"}
                    {food.notes ? ` · ${food.notes}` : ""}
                  </p>
                </div>
                <p className="num shrink-0 text-sm text-text">
                  {food.calories != null ? `${Math.round(food.calories)} kcal` : "—"}
                </p>
              </li>
            ))}
          </ul>

          {draft.assumptions?.length ? (
            <p className="text-xs text-text-faint">
              Assumptions: {draft.assumptions.join(" · ")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={busy === "save" || saved}
              className="min-h-11 rounded-xl bg-ember px-4 py-2.5 text-sm font-medium text-on-ember disabled:opacity-50"
            >
              {saved ? "Saved" : busy === "save" ? "Saving…" : "Save meal"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setPreview(null);
                setSaved(false);
              }}
              className="min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm text-text-muted hover:text-text"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
