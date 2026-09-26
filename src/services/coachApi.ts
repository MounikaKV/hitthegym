// Jev analysis client. Reads what the Entry page saved (read-only) and asks the
// local API server (server/index.ts) to analyze it with Jev. It renders nothing;
// UI components call analyzeToday() and display the returned CoachResponse.

import type { CoachLogItem, CoachRequest, CoachResponse } from "../types/coach";
import type { DailyEntry, LogEntry } from "../types/entry";
import { loadTodayEntry } from "./entryStorage";

// Same key entryStorage writes to; only read here.
const STORAGE_KEY = "hitthegym.entries.v1";

const API_URL: string = import.meta.env.VITE_COACH_API_URL ?? "http://127.0.0.1:8787";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function toLogItems(entries: LogEntry[]): CoachLogItem[] {
  return entries.map((entry) => ({ text: entry.text, time: toClock(new Date(entry.createdAt)) }));
}

// Latest weigh-in text for each of the previous `days` days, oldest first.
function readRecentWeighIns(days: number, now: Date): { dateKey: string; text: string }[] {
  let map: Record<string, { weightEntries?: { text?: unknown }[]; weight?: unknown }>;
  try {
    map = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return [];
  }

  const result: { dateKey: string; text: string }[] = [];
  for (let offset = days; offset >= 1; offset -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const dateKey = toDateKey(date);
    const day = map[dateKey];
    // Entries are stored newest first; older saves used a single `weight` string.
    const text = day?.weightEntries?.[0]?.text ?? day?.weight;
    if (typeof text === "string" && text.trim()) {
      result.push({ dateKey, text: text.trim() });
    }
  }

  return result;
}

export function buildCoachRequest(day: DailyEntry, now = new Date()): CoachRequest {
  return {
    localTime: toClock(now),
    dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
    today: {
      weightEntries: toLogItems(day.weightEntries),
      exerciseEntries: toLogItems(day.exerciseEntries),
      foodEntries: toLogItems(day.foodEntries),
    },
    recentWeighIns: readRecentWeighIns(7, now),
  };
}

export async function analyzeDay(day: DailyEntry): Promise<CoachResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCoachRequest(day)),
    });
  } catch {
    throw new Error(`Can't reach the coach API at ${API_URL}. Is it running? Try: npm run dev:server`);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `Coach request failed (${response.status})`);
  }

  return body as CoachResponse;
}

// Analyze everything logged today.
export function analyzeToday(): Promise<CoachResponse> {
  return analyzeDay(loadTodayEntry());
}
