"use client";

import { CameraIcon, KeyboardIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { prepareImageFile } from "@/lib/client/prepare-image";
import { cn } from "@/lib/utils";

type SetDraft = {
  reps?: number | null;
  weightKg?: number | null;
  durationSeconds?: number | null;
  isWarmup?: boolean;
  rpe?: number | null;
};

type ExerciseDraft = {
  name: string;
  exerciseId?: string | null;
  matchedName?: string | null;
  notes?: string | null;
  confidence?: number;
  sets: SetDraft[];
};

type WorkoutDraft = {
  name: string | null;
  date: string;
  notes: string | null;
  exercises: ExerciseDraft[];
  overallConfidence: number;
  source: "photo" | "manual";
};

function formatSetLine(set: SetDraft, index: number) {
  const details = [
    set.reps != null ? `${set.reps} reps` : null,
    set.weightKg != null ? `${set.weightKg} kg` : null,
    set.durationSeconds != null ? `${set.durationSeconds}s` : null,
  ].filter(Boolean);
  return `Set ${index + 1}${set.isWarmup ? " (warmup)" : ""}${details.length ? `: ${details.join(" · ")}` : ""}`;
}

export function WorkoutAiLogger() {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function analyzeText() {
    setBusy("analyze");
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/workouts/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not parse that.");
      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse that.");
    } finally {
      setBusy(null);
    }
  }

  async function analyzePhoto(file: File | null) {
    if (!file) return;
    setBusy("analyze");
    setError(null);
    setSaved(false);
    setDraft(null);
    try {
      const prepared = await prepareImageFile(file);
      setPreview(URL.createObjectURL(prepared));
      const form = new FormData();
      form.append("image", prepared, "machine.jpg");
      if (hint.trim()) form.append("hint", hint.trim());
      const res = await fetch("/api/workouts/analyze-photo", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read that photo.");
      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that photo.");
    } finally {
      setBusy(null);
    }
  }

  async function onSave() {
    if (!draft) return;
    setBusy("save");
    setError(null);
    try {
      const res = await fetch("/api/workouts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
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
      <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => setMode("text")}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            mode === "text"
              ? "bg-ember text-on-ember"
              : "text-text-muted hover:text-text",
          )}
        >
          <KeyboardIcon size={16} />
          Type it
        </button>
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            mode === "photo"
              ? "bg-ember text-on-ember"
              : "text-text-muted hover:text-text",
          )}
        >
          <CameraIcon size={16} />
          Snap machine
        </button>
      </div>

      {mode === "text" ? (
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-sm font-medium text-text">Log with text</h2>
          <p className="mt-1 text-sm text-text-muted">
            Example: bench press 3x8 @60kg, incline db press 12 10 8 @22.5
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="What did you do?"
            className="mt-3 w-full resize-y rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-ember-line"
          />
          <button
            type="button"
            onClick={analyzeText}
            disabled={!text.trim() || busy === "analyze"}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ember px-4 py-2.5 text-sm font-medium text-on-ember disabled:opacity-50"
          >
            {busy === "analyze" ? (
              <SpinnerGapIcon size={16} className="animate-spin" />
            ) : null}
            {busy === "analyze" ? "Parsing…" : "Parse workout"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-sm font-medium text-text">Snap the machine</h2>
          <p className="mt-1 text-sm text-text-muted">
            Point at the station. AI names the move and matches it to your library.
          </p>
          <label className="mt-3 block">
            <span className="label-caps">Optional note</span>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. last set was 8 reps at 70"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-ember-line"
            />
          </label>
          <label
            className={cn(
              "mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-ember px-4 py-2.5 text-sm font-medium text-on-ember",
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
              onChange={(e) => analyzePhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Machine preview"
              className="mt-4 max-h-56 w-full rounded-xl object-cover"
            />
          ) : null}
        </div>
      )}

      {error ? (
        <p className="rounded-xl border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
        </p>
      ) : null}

      {draft ? (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <div>
            <p className="label-caps">Review</p>
            <h3 className="mt-1 text-lg font-medium text-text">{draft.name}</h3>
            <p className="text-xs text-text-faint">{draft.date}</p>
          </div>
          <ul className="space-y-2">
            {draft.exercises.map((ex, i) => (
              <li
                key={`${ex.name}-${i}`}
                className="rounded-xl border border-line bg-surface-raised px-3 py-3"
              >
                <p className="text-sm font-medium text-text">{ex.name}</p>
                {ex.matchedName ? (
                  <p className="mt-0.5 text-xs text-ember">Matched: {ex.matchedName}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-text-faint">Custom movement</p>
                )}
                {ex.sets.length ? (
                  <ul className="mt-2 space-y-1">
                    {ex.sets.map((set, si) => (
                      <li key={si} className="num text-xs text-text-muted">
                        {formatSetLine(set, si)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-text-faint">No sets yet — add them next time.</p>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={busy === "save" || saved}
              className="min-h-11 rounded-xl bg-ember px-4 py-2.5 text-sm font-medium text-on-ember disabled:opacity-50"
            >
              {saved ? "Saved" : busy === "save" ? "Saving…" : "Save workout"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
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
