import type { DailyEntry, LogCollection, LogEntry } from "../types/entry";

const STORAGE_KEY = "hitthegym.entries.v1";

type EntryMap = Record<string, DailyEntry>;

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
