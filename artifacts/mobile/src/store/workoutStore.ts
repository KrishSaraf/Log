import AsyncStorage from "@react-native-async-storage/async-storage";

export type LoggedSet = {
  id: string;
  reps: number;
  weightKg: number;
  completed: boolean;
};

export type LoggedExercise = {
  id: string;
  exerciseId: string;
  name: string;
  bodyPart?: string;
  sets: LoggedSet[];
};

export type WorkoutSession = {
  id: string;
  name: string;
  startedAt: string;
  finishedAt?: string;
  exercises: LoggedExercise[];
  notes?: string;
};

export type LastSetPrefill = {
  weightKg: number;
  reps: number;
};

const HISTORY_KEY = "@krish/workout-history";
const ACTIVE_KEY = "@krish/active-workout";
const SETTINGS_KEY = "@krish/settings";
const MAX_HISTORY = 50;

export type AppSettings = {
  restSeconds: number;
  weightUnit: "kg" | "lb";
  apiBaseUrl: string;
};

export const defaultSettings: AppSettings = {
  restSeconds: 90,
  weightUnit: "kg",
  apiBaseUrl: "",
};

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptySet(prefill?: LastSetPrefill): LoggedSet {
  return {
    id: uid(),
    reps: prefill?.reps ?? 8,
    weightKg: prefill?.weightKg ?? 0,
    completed: false,
  };
}

export function createWorkout(name = "Session"): WorkoutSession {
  return {
    id: uid(),
    name,
    startedAt: new Date().toISOString(),
    exercises: [],
  };
}

export async function loadHistory(): Promise<WorkoutSession[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as WorkoutSession[];
  } catch {
    return [];
  }
}

export async function saveHistory(sessions: WorkoutSession[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_HISTORY)));
}

export async function appendFinished(session: WorkoutSession): Promise<void> {
  const history = await loadHistory();
  history.unshift({ ...session, finishedAt: session.finishedAt ?? new Date().toISOString() });
  await saveHistory(history);
}

export async function loadActive(): Promise<WorkoutSession | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WorkoutSession;
  } catch {
    return null;
  }
}

export async function saveActive(session: WorkoutSession | null): Promise<void> {
  if (!session) {
    await AsyncStorage.removeItem(ACTIVE_KEY);
    return;
  }
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
}

/** Prefill from the most recent finished set for this exercise id or name. */
export async function getLastPrefill(
  exerciseId: string,
  exerciseName: string,
): Promise<LastSetPrefill | undefined> {
  const history = await loadHistory();
  for (const session of history) {
    for (const ex of session.exercises) {
      if (ex.exerciseId === exerciseId || ex.name.toLowerCase() === exerciseName.toLowerCase()) {
        const done = [...ex.sets].reverse().find((s) => s.completed && (s.weightKg > 0 || s.reps > 0));
        if (done) return { weightKg: done.weightKg, reps: done.reps };
      }
    }
  }
  return undefined;
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...defaultSettings };
  try {
    return { ...defaultSettings, ...(JSON.parse(raw) as AppSettings) };
  } catch {
    return { ...defaultSettings };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export { uid };
