import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as Haptics from "expo-haptics";
import { configureApiClient } from "@/lib/api";
import {
  appendFinished,
  createEmptySet,
  createWorkout,
  getLastPrefill,
  loadActive,
  loadHistory,
  loadSettings,
  saveActive,
  saveSettings,
  type AppSettings,
  type LoggedExercise,
  type LoggedSet,
  type WorkoutSession,
  uid,
  defaultSettings,
} from "@/store/workoutStore";

type WorkoutContextValue = {
  active: WorkoutSession | null;
  history: WorkoutSession[];
  settings: AppSettings;
  restEndsAt: number | null;
  hydrated: boolean;
  startWorkout: (name?: string) => Promise<void>;
  discardWorkout: () => Promise<void>;
  finishWorkout: () => Promise<void>;
  addExercise: (input: {
    exerciseId: string;
    name: string;
    bodyPart?: string;
  }) => Promise<void>;
  removeExercise: (exerciseLocalId: string) => Promise<void>;
  updateSet: (
    exerciseLocalId: string,
    setId: string,
    patch: Partial<Pick<LoggedSet, "reps" | "weightKg">>,
  ) => Promise<void>;
  completeSet: (exerciseLocalId: string, setId: string) => Promise<void>;
  addSet: (exerciseLocalId: string) => Promise<void>;
  dismissRest: () => void;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  refreshHistory: () => Promise<void>;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

async function persist(session: WorkoutSession | null) {
  await saveActive(session);
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [a, h, s] = await Promise.all([loadActive(), loadHistory(), loadSettings()]);
      if (cancelled) return;
      setActive(a);
      setHistory(h);
      setSettings(s);
      configureApiClient(s.apiBaseUrl || null);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(async (next: WorkoutSession | null) => {
    setActive(next);
    await persist(next);
  }, []);

  const startWorkout = useCallback(
    async (name?: string) => {
      const session = createWorkout(name);
      await commit(session);
    },
    [commit],
  );

  const discardWorkout = useCallback(async () => {
    setRestEndsAt(null);
    await commit(null);
  }, [commit]);

  const finishWorkout = useCallback(async () => {
    if (!active) return;
    const finished = { ...active, finishedAt: new Date().toISOString() };
    await appendFinished(finished);
    setHistory(await loadHistory());
    setRestEndsAt(null);
    await commit(null);
  }, [active, commit]);

  const addExercise = useCallback(
    async (input: { exerciseId: string; name: string; bodyPart?: string }) => {
      const session = active ?? createWorkout();
      const prefill = await getLastPrefill(input.exerciseId, input.name);
      const exercise: LoggedExercise = {
        id: uid(),
        exerciseId: input.exerciseId,
        name: input.name,
        bodyPart: input.bodyPart,
        sets: [createEmptySet(prefill), createEmptySet(prefill), createEmptySet(prefill)],
      };
      await commit({ ...session, exercises: [...session.exercises, exercise] });
    },
    [active, commit],
  );

  const removeExercise = useCallback(
    async (exerciseLocalId: string) => {
      if (!active) return;
      await commit({
        ...active,
        exercises: active.exercises.filter((e) => e.id !== exerciseLocalId),
      });
    },
    [active, commit],
  );

  const updateSet = useCallback(
    async (
      exerciseLocalId: string,
      setId: string,
      patch: Partial<Pick<LoggedSet, "reps" | "weightKg">>,
    ) => {
      if (!active) return;
      await commit({
        ...active,
        exercises: active.exercises.map((ex) =>
          ex.id !== exerciseLocalId
            ? ex
            : {
                ...ex,
                sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
              },
        ),
      });
    },
    [active, commit],
  );

  const completeSet = useCallback(
    async (exerciseLocalId: string, setId: string) => {
      if (!active) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await commit({
        ...active,
        exercises: active.exercises.map((ex) =>
          ex.id !== exerciseLocalId
            ? ex
            : {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === setId ? { ...s, completed: true } : s,
                ),
              },
        ),
      });
      setRestEndsAt(Date.now() + settings.restSeconds * 1000);
    },
    [active, commit, settings.restSeconds],
  );

  const addSet = useCallback(
    async (exerciseLocalId: string) => {
      if (!active) return;
      await commit({
        ...active,
        exercises: active.exercises.map((ex) => {
          if (ex.id !== exerciseLocalId) return ex;
          const last = [...ex.sets].reverse().find((s) => s.completed) ?? ex.sets[ex.sets.length - 1];
          return {
            ...ex,
            sets: [
              ...ex.sets,
              createEmptySet(
                last ? { weightKg: last.weightKg, reps: last.reps } : undefined,
              ),
            ],
          };
        }),
      });
    },
    [active, commit],
  );

  const dismissRest = useCallback(() => setRestEndsAt(null), []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      if (patch.apiBaseUrl != null) {
        configureApiClient(patch.apiBaseUrl || null);
      }
      return next;
    });
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistory(await loadHistory());
  }, []);

  const value = useMemo(
    () => ({
      active,
      history,
      settings,
      restEndsAt,
      hydrated,
      startWorkout,
      discardWorkout,
      finishWorkout,
      addExercise,
      removeExercise,
      updateSet,
      completeSet,
      addSet,
      dismissRest,
      updateSettings,
      refreshHistory,
    }),
    [
      active,
      history,
      settings,
      restEndsAt,
      hydrated,
      startWorkout,
      discardWorkout,
      finishWorkout,
      addExercise,
      removeExercise,
      updateSet,
      completeSet,
      addSet,
      dismissRest,
      updateSettings,
      refreshHistory,
    ],
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}
