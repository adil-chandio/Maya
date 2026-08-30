// ===== SMART ROUTINE BUILDER =====
// Create, manage, and execute automated routines

import type { Routine, RoutineTrigger, RoutineStep } from "./types";

const STORAGE_KEY = "maya_routines";

// ===== DEFAULT ROUTINES =====

const DEFAULT_ROUTINES: Routine[] = [
  {
    id: "good-morning",
    name: "Good Morning ☀️",
    trigger: { type: "command", phrase: "good morning" },
    steps: [
      { action: "time_check", params: {} },
      { action: "weather_check", params: {} },
      { action: "alarm_set", params: { time: "7:00 AM" } },
    ],
    enabled: true,
    createdAt: Date.now(),
    lastRun: null,
    runCount: 0,
  },
  {
    id: "good-night",
    name: "Good Night 🌙",
    trigger: { type: "command", phrase: "good night" },
    steps: [
      { action: "alarm_set", params: { time: "7:00 AM" } },
      { action: "mute", params: {} },
    ],
    enabled: true,
    createdAt: Date.now(),
    lastRun: null,
    runCount: 0,
  },
];

// ===== CRUD OPERATIONS =====

export function getAllRoutines(): Routine[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const routines = JSON.parse(stored) as Routine[];
      // Merge with defaults if missing
      for (const def of DEFAULT_ROUTINES) {
        if (!routines.find((r) => r.id === def.id)) {
          routines.push(def);
        }
      }
      return routines;
    }
  } catch { /* ignore */ }
  return [...DEFAULT_ROUTINES];
}

export function saveRoutines(routines: Routine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
  } catch { /* ignore */ }
}

export function createRoutine(
  name: string,
  trigger: RoutineTrigger,
  steps: RoutineStep[]
): Routine {
  const routine: Routine = {
    id: `routine-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    trigger,
    steps,
    enabled: true,
    createdAt: Date.now(),
    lastRun: null,
    runCount: 0,
  };

  const routines = getAllRoutines();
  routines.push(routine);
  saveRoutines(routines);
  return routine;
}

export function deleteRoutine(id: string) {
  const routines = getAllRoutines().filter((r) => r.id !== id);
  saveRoutines(routines);
}

export function toggleRoutine(id: string) {
  const routines = getAllRoutines().map((r) =>
    r.id === id ? { ...r, enabled: !r.enabled } : r
  );
  saveRoutines(routines);
}

// ===== ROUTINE DETECTION =====

export function findMatchingRoutine(input: string): Routine | null {
  const lower = input.toLowerCase().trim();
  const routines = getAllRoutines().filter((r) => r.enabled);

  for (const routine of routines) {
    if (routine.trigger.type === "command") {
      const phrase = routine.trigger.phrase.toLowerCase();
      if (lower === phrase || lower.includes(phrase)) {
        return routine;
      }
    }
    if (routine.trigger.type === "greeting") {
      const greetings = ["good morning", "good afternoon", "good evening", "good night", "subah", "raat"];
      if (greetings.some((g) => lower.includes(g))) {
        return routine;
      }
    }
  }
  return null;
}

// ===== ROUTINE EXECUTION TRACKING =====

export function markRoutineRun(id: string) {
  const routines = getAllRoutines().map((r) =>
    r.id === id
      ? { ...r, lastRun: Date.now(), runCount: r.runCount + 1 }
      : r
  );
  saveRoutines(routines);
}

// ===== PRESET ROUTINE TEMPLATES =====

export const ROUTINE_TEMPLATES = [
  {
    id: "morning",
    name: "☀️ Good Morning",
    description: "Weather, alarm, schedule check",
    trigger: "good morning",
    steps: ["Check time & weather", "Set morning alarm", "Read schedule"],
  },
  {
    id: "night",
    name: "🌙 Good Night",
    description: "Silent mode, next day alarm",
    trigger: "good night",
    steps: ["Set morning alarm", "Mute notifications"],
  },
  {
    id: "work",
    name: "💼 Work Mode",
    description: "Focus mode, DND, music",
    trigger: "work mode",
    steps: ["Set DND", "Play focus music", "Start timer 25 min"],
  },
  {
    id: "gym",
    name: "💪 Gym Time",
    description: "Workout playlist, timer",
    trigger: "gym time",
    steps: ["Play workout playlist", "Set 1 hour timer"],
  },
  {
    id: "drive",
    name: "🚗 Driving Mode",
    description: "Maps, music, hands-free",
    trigger: "driving mode",
    steps: ["Open Google Maps", "Play driving playlist", "Set do not disturb"],
  },
];
