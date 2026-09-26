import { loadAllEntries, loadProfile } from "./entryStorage";
import type { DailyEntry, LogEntry } from "../types/entry";
import type {
  ReviewExerciseLog,
  ReviewFoodLog,
  ReviewPayload,
} from "../types/review";

function getTodayDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseWeightValue(text: string): number | null {
  const match = text.match(/\d+(\.\d+)?/);
  if (!match) {
    return null;
  }

  return Number(match[0]);
}

function toHHMM(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function flattenWeights(
  entriesByDay: Record<string, DailyEntry>,
): Array<{ createdAt: string; value: number }> {
  const weights: Array<{ createdAt: string; value: number }> = [];

  Object.values(entriesByDay).forEach((day) => {
    day.weightEntries.forEach((entry) => {
      const parsed = parseWeightValue(entry.text);
      if (parsed !== null) {
        weights.push({
          createdAt: entry.createdAt,
          value: parsed,
        });
      }
    });
  });

  return weights.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

function inferExerciseType(entry: string): string | null {
  const normalized = entry.toLowerCase();

  if (normalized.includes("run") || normalized.includes("jog")) {
    return "run";
  }

  if (normalized.includes("walk") || normalized.includes("hike")) {
    return "walk";
  }

  if (normalized.includes("bike") || normalized.includes("cycle")) {
    return "bike";
  }

  if (
    normalized.includes("lift") ||
    normalized.includes("squat") ||
    normalized.includes("deadlift")
  ) {
    return "strength";
  }

  return null;
}

function inferDurationMinutes(entry: string): number | null {
  const minuteMatch = entry
    .toLowerCase()
    .match(/(\d{1,3})\s*(min|mins|minute|minutes)/);
  if (minuteMatch) {
    return Number(minuteMatch[1]);
  }

  return null;
}

function hasActivity(day: DailyEntry): boolean {
  return (
    day.weightEntries.length > 0 ||
    day.exerciseEntries.length > 0 ||
    day.foodEntries.length > 0
  );
}

function calculateStreak(entriesByDay: Record<string, DailyEntry>): number {
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = getTodayDateKey(date);
    const day = entriesByDay[key];

    if (!day || !hasActivity(day)) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function daysSince(dateString: string): number {
  const then = new Date(dateString);
  const now = new Date();
  const midnightNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const midnightThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  ).getTime();

  return Math.max(0, Math.floor((midnightNow - midnightThen) / 86400000));
}

export function buildReviewPayload(): ReviewPayload {
  const entriesByDay = loadAllEntries();
  const profile = loadProfile();
  const todayKey = getTodayDateKey();

  const todayEntry = entriesByDay[todayKey];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getTodayDateKey(yesterdayDate);
  const yesterdayEntry = entriesByDay[yesterdayKey];

  const allWeightValues = flattenWeights(entriesByDay);
  // Oldest to newest, matching the Jev state format (today's weight is last).
  const last7Weights = allWeightValues
    .slice(0, 7)
    .reverse()
    .map((item) => item.value);
  const sevenDayAvg =
    last7Weights.length > 0
      ? Number(
          (
            last7Weights.reduce((sum, value) => sum + value, 0) /
            last7Weights.length
          ).toFixed(1),
        )
      : null;

  const todayWeight = todayEntry?.weightEntries.length
    ? parseWeightValue(todayEntry.weightEntries[0].text)
    : null;

  const yesterdayWeight = yesterdayEntry?.weightEntries.length
    ? parseWeightValue(yesterdayEntry.weightEntries[0].text)
    : null;

  const foodToday: ReviewFoodLog[] = (todayEntry?.foodEntries ?? [])
    .slice()
    .reverse()
    .map((entry) => ({
      time: toHHMM(entry.createdAt),
      entry: entry.text,
    }));

  const exerciseToday: ReviewExerciseLog[] = (
    todayEntry?.exerciseEntries ?? []
  ).map((entry: LogEntry) => ({
    type: inferExerciseType(entry.text),
    duration_min: inferDurationMinutes(entry.text),
    entry: entry.text,
  }));

  const daysSinceLastWeighIn =
    allWeightValues.length > 0 ? daysSince(allWeightValues[0].createdAt) : null;

  return {
    user_id: "user_482",
    date: todayKey,
    profile,
    weight: {
      today_lbs: todayWeight,
      yesterday_lbs: yesterdayWeight,
      seven_day_avg_lbs: sevenDayAvg,
      last_7_entries_lbs: last7Weights,
    },
    food_log_today: foodToday,
    exercise_log_today: exerciseToday,
    activity: {
      steps_so_far_today: null,
      avg_steps_last_7_days: null,
      sleep_hours_last_night: null,
    },
    engagement: {
      current_logging_streak_days: calculateStreak(entriesByDay),
      days_since_last_weigh_in: daysSinceLastWeighIn,
    },
  };
}
