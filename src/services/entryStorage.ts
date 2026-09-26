import type { DailyEntry, LogCollection, LogEntry } from "../types/entry";
import type { UserProfile } from "../types/review";

const STORAGE_KEY = "hitthegym.entries.v1";
const DEMO_SEEDED_KEY = "hitthegym.entries.demoSeeded.v1";
const PROFILE_STORAGE_KEY = "hitthegym.profile.v1";
const PROFILE_DEMO_SEEDED_KEY = "hitthegym.profile.demoSeeded.v1";

type EntryMap = Record<string, DailyEntry>;

const DEMO_PROFILE: UserProfile = {
  goal_weight_lbs: 175,
  starting_weight_lbs: 205,
  daily_step_goal: 9000,
};

function getTodayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function readMap(): EntryMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as EntryMap;
  } catch {
    return {};
  }
}

function writeMap(map: EntryMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function getDateKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function createDemoTimestamp(
  daysAgo: number,
  minHour: number,
  maxHour: number,
): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(
    randomInt(minHour, maxHour),
    randomInt(0, 59),
    randomInt(0, 59),
    0,
  );

  return date.toISOString();
}

function createDemoLogEntries(
  dateKey: string,
  daysAgo: number,
  count: number,
  minHour: number,
  maxHour: number,
  textFactory: (index: number) => string,
  prefix: string,
): LogEntry[] {
  const entries = Array.from({ length: count }, (_, index) => {
    const createdAt = createDemoTimestamp(daysAgo, minHour, maxHour);

    return {
      id: `${prefix}-${dateKey}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      text: textFactory(index),
      createdAt,
    } satisfies LogEntry;
  });

  return entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function buildDemoDay(date: Date, daysAgo: number): DailyEntry {
  const dateKey = getDateKeyFromDate(date);
  const baseWeight = 178 + randomInt(-7, 7);
  const exerciseSamples = [
    "Upper body session, 45 min",
    "Lower body session, 50 min",
    "Full body circuit, 35 min",
    "Zone 2 cardio, 30 min",
    "Mobility + core, 25 min",
    "Restorative walk, 40 min",
  ];
  const foodSamples = [
    "Overnight oats + banana",
    "Greek yogurt + berries",
    "Chicken bowl with rice",
    "Protein shake + peanut butter toast",
    "Salmon, potatoes, mixed greens",
    "Egg scramble + avocado",
    "Turkey sandwich + fruit",
  ];

  const weightEntries = createDemoLogEntries(
    dateKey,
    daysAgo,
    randomInt(1, 3),
    6,
    20,
    (index) => `${(baseWeight + index * 0.2).toFixed(1)} lb`,
    "demo-weight",
  );

  const exerciseEntries = createDemoLogEntries(
    dateKey,
    daysAgo,
    randomInt(0, 2),
    7,
    21,
    () => randomPick(exerciseSamples),
    "demo-exercise",
  );

  const foodEntries = createDemoLogEntries(
    dateKey,
    daysAgo,
    randomInt(2, 5),
    7,
    22,
    () => randomPick(foodSamples),
    "demo-food",
  );

  return {
    dateKey,
    weightEntries,
    exerciseEntries,
    foodEntries,
    updatedAt: new Date().toISOString(),
  };
}

export function ensureDemoHistorySeeded(): void {
  if (localStorage.getItem(DEMO_SEEDED_KEY) === "1") {
    return;
  }

  const map = readMap();

  for (let daysAgo = 0; daysAgo < 21; daysAgo += 1) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateKey = getDateKeyFromDate(date);

    if (!map[dateKey]) {
      map[dateKey] = buildDemoDay(date, daysAgo);
    }
  }

  writeMap(map);
  localStorage.setItem(DEMO_SEEDED_KEY, "1");
}

export function ensureDemoProfileSeeded(): void {
  if (localStorage.getItem(PROFILE_DEMO_SEEDED_KEY) === "1") {
    return;
  }

  const existing = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(DEMO_PROFILE));
  }

  localStorage.setItem(PROFILE_DEMO_SEEDED_KEY, "1");
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return DEMO_PROFILE;
    }

    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      goal_weight_lbs:
        typeof parsed.goal_weight_lbs === "number"
          ? parsed.goal_weight_lbs
          : DEMO_PROFILE.goal_weight_lbs,
      starting_weight_lbs:
        typeof parsed.starting_weight_lbs === "number"
          ? parsed.starting_weight_lbs
          : DEMO_PROFILE.starting_weight_lbs,
      daily_step_goal:
        typeof parsed.daily_step_goal === "number"
          ? parsed.daily_step_goal
          : DEMO_PROFILE.daily_step_goal,
    };
  } catch {
    return DEMO_PROFILE;
  }
}

function createEmptyDay(dateKey: string): DailyEntry {
  return {
    dateKey,
    weightEntries: [],
    exerciseEntries: [],
    foodEntries: [],
    updatedAt: new Date().toISOString(),
  };
}

function parseLogEntries(input: unknown): LogEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const candidate = item as Partial<LogEntry>;
      if (!candidate || typeof candidate.id !== "string" || typeof candidate.text !== "string") {
        return null;
      }

      return {
        id: candidate.id,
        text: candidate.text,
        createdAt:
          typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
      };
    })
    .filter((item): item is LogEntry => item !== null);
}

function normalizeDailyEntry(raw: unknown, dateKey: string): DailyEntry {
  const fallback = createEmptyDay(dateKey);

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as Record<string, unknown>;
  const updatedAt = typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString();
  const createdAt = updatedAt;

  const weightEntries = parseLogEntries(source.weightEntries);
  const exerciseEntries = parseLogEntries(source.exerciseEntries);
  const foodEntries = parseLogEntries(source.foodEntries);

  const legacyWeight = typeof source.weight === "string" ? source.weight.trim() : "";
  const legacyExercise = typeof source.exercise === "string" ? source.exercise.trim() : "";

  return {
    dateKey,
    weightEntries:
      weightEntries.length > 0
        ? weightEntries
        : legacyWeight
          ? [{ id: `legacy-weight-${dateKey}`, text: legacyWeight, createdAt }]
          : [],
    exerciseEntries:
      exerciseEntries.length > 0
        ? exerciseEntries
        : legacyExercise
          ? [{ id: `legacy-exercise-${dateKey}`, text: legacyExercise, createdAt }]
          : [],
    foodEntries,
    updatedAt,
  };
}

export function loadAllEntries(): EntryMap {
  const rawMap = readMap();
  const normalized: EntryMap = {};

  Object.entries(rawMap).forEach(([dateKey, value]) => {
    normalized[dateKey] = normalizeDailyEntry(value, dateKey);
  });

  return normalized;
}

export function loadTodayEntry(): DailyEntry {
  const dateKey = getTodayKey();
  const map = readMap();

  return normalizeDailyEntry(map[dateKey], dateKey);
}

export function saveTodayEntry(partial: Partial<DailyEntry>): DailyEntry {
  const dateKey = getTodayKey();
  const map = readMap();
  const current = normalizeDailyEntry(map[dateKey], dateKey);
  const next: DailyEntry = {
    ...current,
    ...partial,
    dateKey,
    updatedAt: new Date().toISOString(),
  };

  map[dateKey] = next;
  writeMap(map);

  return next;
}

function addTodayLogEntry(collection: LogCollection, text: string): DailyEntry {
  const trimmed = text.trim();
  if (!trimmed) {
    return loadTodayEntry();
  }

  const current = loadTodayEntry();
  const entry: LogEntry = {
    id: `${Date.now()}`,
    text: trimmed,
    createdAt: new Date().toISOString(),
  };

  return saveTodayEntry({
    [collection]: [entry, ...current[collection]],
  });
}

export function addTodayWeightEntry(text: string): DailyEntry {
  return addTodayLogEntry("weightEntries", text);
}

export function addTodayExerciseEntry(text: string): DailyEntry {
  return addTodayLogEntry("exerciseEntries", text);
}

export function addTodayFoodEntry(text: string): DailyEntry {
  return addTodayLogEntry("foodEntries", text);
}

export function updateTodayLogEntry(collection: LogCollection, id: string, text: string): DailyEntry {
  const trimmed = text.trim();
  if (!trimmed) {
    return deleteTodayLogEntry(collection, id);
  }

  const current = loadTodayEntry();
  const nextItems = current[collection].map((item) =>
    item.id === id
      ? {
          ...item,
          text: trimmed,
        }
      : item,
  );

  return saveTodayEntry({
    [collection]: nextItems,
  });
}

export function deleteTodayLogEntry(collection: LogCollection, id: string): DailyEntry {
  const current = loadTodayEntry();
  const nextItems = current[collection].filter((item) => item.id !== id);

  return saveTodayEntry({
    [collection]: nextItems,
  });
}
