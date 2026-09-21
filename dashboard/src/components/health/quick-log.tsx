"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  CircleNotchIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { todayIso } from "@/lib/format";

type Tab = "weight" | "sleep" | "water" | "vitals" | "feel";

const TABS: { id: Tab; label: string }[] = [
  { id: "weight", label: "Body" },
  { id: "sleep", label: "Sleep" },
  { id: "water", label: "Water" },
  { id: "vitals", label: "Vitals" },
  { id: "feel", label: "Mood" },
];

const SLEEP_PRESETS = [
  { label: "6h", hours: 6, minutes: 0 },
  { label: "7h", hours: 7, minutes: 0 },
  { label: "7.5h", hours: 7, minutes: 30 },
  { label: "8h", hours: 8, minutes: 0 },
  { label: "9h", hours: 9, minutes: 0 },
] as const;

const QUALITY_LABELS = ["Rough", "Fair", "OK", "Good", "Great"] as const;

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint transition-[border-color,box-shadow] focus:border-lime-line focus:shadow-[0_0_0_3px_var(--lime-quiet)]";

const labelClass = "block text-xs font-medium text-text-muted";

/**
 * Manual health logging — body metrics, sleep, water, HR/BP, mood/energy.
 * Posts to `/api/health/*` and refreshes the server page.
 */
export function QuickLog({
  defaults,
  initialTab = "weight",
  id = "quick-log",
}: {
  defaults?: {
    weightKg?: number | null;
    bodyFatPct?: number | null;
    waistCm?: number | null;
    leanMassKg?: number | null;
    waterMl?: number | null;
    restingHeartRate?: number | null;
    bpSystolic?: number | null;
    bpDiastolic?: number | null;
    mood?: number | null;
    energy?: number | null;
    sleepMinutes?: number | null;
  };
  initialTab?: Tab;
  id?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [date, setDate] = React.useState(todayIso());
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [weight, setWeight] = React.useState(
    defaults?.weightKg != null ? String(defaults.weightKg) : "",
  );
  const [bodyFat, setBodyFat] = React.useState(
    defaults?.bodyFatPct != null ? String(defaults.bodyFatPct) : "",
  );
  const [waist, setWaist] = React.useState(
    defaults?.waistCm != null ? String(defaults.waistCm) : "",
  );
  const [leanMass, setLeanMass] = React.useState(
    defaults?.leanMassKg != null ? String(defaults.leanMassKg) : "",
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
  const [sleepQuality, setSleepQuality] = React.useState(3);
  const [waterGlasses, setWaterGlasses] = React.useState(
    defaults?.waterMl != null
      ? Math.max(1, Math.round(defaults.waterMl / 250))
      : 4,
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
    defaults?.mood != null ? Math.round(defaults.mood) : 3,
  );
  const [energy, setEnergy] = React.useState(
    defaults?.energy != null ? Math.round(defaults.energy) : 3,
  );

  React.useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 2800);
    return () => window.clearTimeout(t);
  }, [message]);

  function nudgeWeight(delta: number) {
    const current = Number(weight);
    const base = Number.isFinite(current) && current > 0 ? current : 70;
    setWeight((Math.round((base + delta) * 10) / 10).toFixed(1));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      if (tab === "sleep") {
        const hours = Number(sleepHours) || 0;
        const minutes = Number(sleepMins) || 0;
        if (hours === 0 && minutes === 0) {
          throw new Error("Enter how long you slept.");
        }
        const res = await fetch("/api/health/sleep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            hours,
            minutes,
            quality: sleepQuality,
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
          const weightN = Number(weight);
          const fatN = Number(bodyFat);
          const waistN = Number(waist);
          const leanN = Number(leanMass);
          if (Number.isFinite(weightN) && weightN > 0) {
            entries.push({ metric: "weight_kg", value: weightN, unit: "kg" });
          }
          if (Number.isFinite(fatN) && fatN > 0) {
            entries.push({ metric: "body_fat_pct", value: fatN, unit: "%" });
          }
          if (Number.isFinite(waistN) && waistN > 0) {
            entries.push({ metric: "waist_cm", value: waistN, unit: "cm" });
          }
          if (Number.isFinite(leanN) && leanN > 0) {
            entries.push({ metric: "lean_mass_kg", value: leanN, unit: "kg" });
          }
          if (entries.length === 0) {
            throw new Error("Enter weight and/or another body metric.");
          }
        } else if (tab === "water") {
          if (!Number.isFinite(waterGlasses) || waterGlasses <= 0) {
            throw new Error("Add at least one glass.");
          }
          entries.push({
            metric: "water_ml",
            value: waterGlasses * 250,
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
          entries.push({ metric: "mood", value: mood });
          entries.push({ metric: "energy", value: energy });
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
        setMessage(
          tab === "weight"
            ? "Body metrics saved."
            : tab === "water"
              ? "Water saved."
              : "Saved.",
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id={id} onSubmit={submit} className="space-y-4">
      <div
        role="tablist"
        aria-label="Log type"
        className="flex flex-wrap gap-1.5"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setMessage(null);
              setError(null);
            }}
            className={cn(
              "min-h-9 rounded-lg border px-3 text-sm transition-[color,background-color,border-color] duration-200",
              tab === item.id
                ? "border-lime-line bg-lime-quiet font-medium text-text"
                : "border-line text-text-muted hover:border-lime-line hover:text-text",
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

      <div
        key={tab}
        className="animate-[reveal-up_240ms_var(--ease-out-quint)_both] space-y-4"
      >
        {tab === "weight" ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between gap-2">
                <label className={labelClass} htmlFor="ql-weight">
                  Weight (kg)
                </label>
                <div className="flex gap-1">
                  <NudgeButton
                    label="Decrease 0.1 kg"
                    onClick={() => nudgeWeight(-0.1)}
                  >
                    <MinusIcon size={14} weight="bold" aria-hidden />
                  </NudgeButton>
                  <NudgeButton
                    label="Increase 0.1 kg"
                    onClick={() => nudgeWeight(0.1)}
                  >
                    <PlusIcon size={14} weight="bold" aria-hidden />
                  </NudgeButton>
                </div>
              </div>
              <input
                id="ql-weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="20"
                max="400"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={fieldClass}
                placeholder="72.5"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className={labelClass}>
                Body fat %
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="1"
                  max="70"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  className={fieldClass}
                  placeholder="18.5"
                />
              </label>
              <label className={labelClass}>
                Waist (cm)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="40"
                  max="200"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  className={fieldClass}
                  placeholder="80"
                />
              </label>
              <label className={labelClass}>
                Lean mass (kg)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="20"
                  max="200"
                  value={leanMass}
                  onChange={(e) => setLeanMass(e.target.value)}
                  className={fieldClass}
                  placeholder="58"
                />
              </label>
            </div>
            <p className="text-xs text-text-faint">
              Save any combination — weight alone is enough for Today.
            </p>
          </div>
        ) : null}

        {tab === "sleep" ? (
          <div className="space-y-4">
            <div>
              <p className={labelClass}>Quick duration</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SLEEP_PRESETS.map((preset) => {
                  const active =
                    Number(sleepHours) === preset.hours &&
                    Number(sleepMins) === preset.minutes;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSleepHours(String(preset.hours));
                        setSleepMins(String(preset.minutes));
                      }}
                      className={cn(
                        "min-h-9 rounded-lg border px-3 text-sm transition-colors",
                        active
                          ? "border-lime-line bg-lime text-on-lime"
                          : "border-line text-text-muted hover:border-lime-line hover:text-text",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div>
              <p className={labelClass}>
                Quality · {QUALITY_LABELS[sleepQuality - 1]}
              </p>
              <div className="mt-1.5 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSleepQuality(n)}
                    aria-label={`Quality ${n}: ${QUALITY_LABELS[n - 1]}`}
                    className={cn(
                      "flex size-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                      sleepQuality === n
                        ? "border-lime-line bg-lime text-on-lime"
                        : "border-line text-text-muted hover:border-lime-line hover:text-text",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "water" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                Glasses today{" "}
                <span className="text-text-faint">(250 ml each)</span>
              </p>
              <p className="num text-lg text-text">
                {waterGlasses}
                <span className="ml-1 text-xs text-text-faint">
                  · {((waterGlasses * 250) / 1000).toFixed(1)} L
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                const filled = n <= waterGlasses;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWaterGlasses(n)}
                    aria-label={`${n} glass${n === 1 ? "" : "es"}`}
                    className={cn(
                      "size-9 rounded-lg border transition-colors duration-150",
                      filled
                        ? "border-lime-line bg-lime-quiet"
                        : "border-line bg-surface-raised hover:border-lime-line",
                    )}
                  >
                    <span
                      className={cn(
                        "mx-auto block size-2 rounded-full",
                        filled ? "bg-lime" : "bg-line-strong",
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>
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
          <div className="space-y-4">
            <ScalePicker
              label="Mood"
              value={mood}
              onChange={setMood}
              labels={["Low", "Meh", "OK", "Good", "Great"]}
            />
            <ScalePicker
              label="Energy"
              value={energy}
              onChange={setEnergy}
              labels={["Drained", "Low", "Steady", "Up", "Wired"]}
            />
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-negative">{error}</p> : null}
      {message ? (
        <p
          role="status"
          className="flex items-center gap-1.5 text-sm text-lime animate-[reveal-up_220ms_var(--ease-out-quint)_both]"
        >
          <CheckCircleIcon size={16} weight="fill" aria-hidden />
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-lime px-4 text-sm font-medium text-on-lime transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? (
          <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
        ) : null}
        {tab === "sleep"
          ? "Save sleep"
          : tab === "weight"
            ? "Save body metrics"
            : "Save"}
      </button>
    </form>
  );
}

function NudgeButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md border border-line text-text-muted transition-colors hover:border-lime-line hover:text-lime"
    >
      {children}
    </button>
  );
}

function ScalePicker({
  label,
  value,
  onChange,
  labels,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  labels: readonly string[];
}) {
  return (
    <div>
      <p className={labelClass}>
        {label} · {labels[value - 1]}
      </p>
      <div className="mt-1.5 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} ${n}: ${labels[n - 1]}`}
            className={cn(
              "flex size-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
              value === n
                ? "border-lime-line bg-lime text-on-lime"
                : "border-line text-text-muted hover:border-lime-line hover:text-text",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
