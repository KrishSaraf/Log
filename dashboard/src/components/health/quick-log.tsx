"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleNotchIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { todayIso } from "@/lib/format";

type Tab = "weight" | "sleep" | "water" | "vitals" | "feel";

const TABS: { id: Tab; label: string }[] = [
  { id: "weight", label: "Weight" },
  { id: "sleep", label: "Sleep" },
  { id: "water", label: "Water" },
  { id: "vitals", label: "Vitals" },
  { id: "feel", label: "Mood" },
];

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-lime-line";

const labelClass = "block text-xs font-medium text-text-muted";

/**
 * Manual health logging — weight, sleep, water, HR/BP, mood/energy.
 * Posts to `/api/health/*` and refreshes the server page.
 */
export function QuickLog({
  defaults,
}: {
  defaults?: {
    weightKg?: number | null;
    waterMl?: number | null;
    restingHeartRate?: number | null;
    bpSystolic?: number | null;
    bpDiastolic?: number | null;
    mood?: number | null;
    energy?: number | null;
    sleepMinutes?: number | null;
  };
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("weight");
  const [date, setDate] = React.useState(todayIso());
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [weight, setWeight] = React.useState(
    defaults?.weightKg != null ? String(defaults.weightKg) : "",
  );
  const [sleepHours, setSleepHours] = React.useState(
    defaults?.sleepMinutes != null
      ? String(Math.floor(defaults.sleepMinutes / 60))
      : "7",
  );
  const [sleepMins, setSleepMins] = React.useState(
    defaults?.sleepMinutes != null
      ? String(defaults.sleepMinutes % 60)
      : "30",
  );
  const [sleepQuality, setSleepQuality] = React.useState("3");
  const [waterGlasses, setWaterGlasses] = React.useState(
    defaults?.waterMl != null
      ? String(Math.max(1, Math.round(defaults.waterMl / 250)))
      : "4",
  );
  const [hr, setHr] = React.useState(
    defaults?.restingHeartRate != null
      ? String(Math.round(defaults.restingHeartRate))
      : "",
  );
  const [sys, setSys] = React.useState(
    defaults?.bpSystolic != null ? String(Math.round(defaults.bpSystolic)) : "",
  );
  const [dia, setDia] = React.useState(
    defaults?.bpDiastolic != null
      ? String(Math.round(defaults.bpDiastolic))
      : "",
  );
  const [mood, setMood] = React.useState(
    defaults?.mood != null ? String(Math.round(defaults.mood)) : "3",
  );
  const [energy, setEnergy] = React.useState(
    defaults?.energy != null ? String(Math.round(defaults.energy)) : "3",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      if (tab === "sleep") {
        const res = await fetch("/api/health/sleep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            hours: Number(sleepHours) || 0,
            minutes: Number(sleepMins) || 0,
            quality: Number(sleepQuality) || null,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error || "Could not save sleep.");
        }
        setMessage("Sleep saved.");
      } else {
        const entries: Array<{
          metric: string;
          value: number;
          unit?: string;
        }> = [];

        if (tab === "weight") {
          const value = Number(weight);
          if (!Number.isFinite(value) || value <= 0) {
            throw new Error("Enter a weight in kg.");
          }
          entries.push({ metric: "weight_kg", value, unit: "kg" });
        } else if (tab === "water") {
          const glasses = Number(waterGlasses);
          if (!Number.isFinite(glasses) || glasses <= 0) {
            throw new Error("Enter how many glasses.");
          }
          entries.push({
            metric: "water_ml",
            value: glasses * 250,
            unit: "ml",
          });
        } else if (tab === "vitals") {
          const hrN = Number(hr);
          const sysN = Number(sys);
          const diaN = Number(dia);
          if (Number.isFinite(hrN) && hrN > 0) {
            entries.push({
              metric: "heart_rate_resting",
              value: hrN,
              unit: "bpm",
            });
          }
          if (Number.isFinite(sysN) && sysN > 0) {
            entries.push({
              metric: "blood_pressure_systolic",
              value: sysN,
              unit: "mmHg",
            });
          }
          if (Number.isFinite(diaN) && diaN > 0) {
            entries.push({
              metric: "blood_pressure_diastolic",
              value: diaN,
              unit: "mmHg",
            });
          }
          if (entries.length === 0) {
            throw new Error("Enter resting HR and/or blood pressure.");
          }
        } else if (tab === "feel") {
          entries.push({ metric: "mood", value: Number(mood) || 3 });
          entries.push({ metric: "energy", value: Number(energy) || 3 });
        }

        const res = await fetch("/api/health/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, entries }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error || "Could not save.");
        }
        setMessage("Saved.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setMessage(null);
              setError(null);
            }}
            className={cn(
              "min-h-9 rounded-lg border px-3 text-sm transition-colors",
              tab === item.id
                ? "border-lime-line bg-lime-quiet font-medium text-text"
                : "border-line text-text-muted hover:text-text",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className={labelClass}>
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={fieldClass}
          required
        />
      </label>

      {tab === "weight" ? (
        <label className={labelClass}>
          Weight (kg)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="400"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={fieldClass}
            placeholder="72.5"
            required
          />
        </label>
      ) : null}

      {tab === "sleep" ? (
        <div className="grid grid-cols-3 gap-3">
          <label className={labelClass}>
            Hours
            <input
              type="number"
              min="0"
              max="24"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Minutes
            <input
              type="number"
              min="0"
              max="59"
              value={sleepMins}
              onChange={(e) => setSleepMins(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Quality (1–5)
            <input
              type="number"
              min="1"
              max="5"
              value={sleepQuality}
              onChange={(e) => setSleepQuality(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
      ) : null}

      {tab === "water" ? (
        <label className={labelClass}>
          Glasses today (250 ml each)
          <input
            type="number"
            min="1"
            max="40"
            value={waterGlasses}
            onChange={(e) => setWaterGlasses(e.target.value)}
            className={fieldClass}
            required
          />
        </label>
      ) : null}

      {tab === "vitals" ? (
        <div className="grid grid-cols-3 gap-3">
          <label className={labelClass}>
            Resting HR
            <input
              type="number"
              min="30"
              max="220"
              value={hr}
              onChange={(e) => setHr(e.target.value)}
              className={fieldClass}
              placeholder="bpm"
            />
          </label>
          <label className={labelClass}>
            Systolic
            <input
              type="number"
              min="60"
              max="250"
              value={sys}
              onChange={(e) => setSys(e.target.value)}
              className={fieldClass}
              placeholder="mmHg"
            />
          </label>
          <label className={labelClass}>
            Diastolic
            <input
              type="number"
              min="40"
              max="150"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              className={fieldClass}
              placeholder="mmHg"
            />
          </label>
        </div>
      ) : null}

      {tab === "feel" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Mood (1–5)
            <input
              type="number"
              min="1"
              max="5"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Energy (1–5)
            <input
              type="number"
              min="1"
              max="5"
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
      ) : null}

      {error ? <p className="text-sm text-negative">{error}</p> : null}
      {message ? <p className="text-sm text-lime">{message}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime px-4 text-sm font-medium text-on-lime transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? (
          <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
        ) : null}
        Save
      </button>
    </form>
  );
}
