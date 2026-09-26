import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { APIError, AuthenticationError, TypeSafeClient } from "@typesafe-ai/sdk";
import type { CoachLogItem, CoachRequest } from "../src/types/coach.ts";
import type { ReviewPayload } from "../src/types/review.ts";
import type { WeatherContext } from "../src/types/weather.ts";
import { runCoach } from "./coach.ts";
import { runLens, type JevLensRequest } from "./lens.ts";

// Loads TYPESAFE_API_KEY (and optional PORT) from .env when present.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file; rely on the real environment.
}

const PORT = Number(process.env.PORT ?? 8787);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_ITEMS = 50;
const MAX_TEXT = 500;

const TYPESAFE_API_URL = "https://api.typesafe.ai";

// The API key is sent to this URL, so only allow TypeSafe itself or a local test server.
function resolveBaseURL(): string {
  const override = process.env.TYPESAFE_BASE_URL;
  if (!override || override === TYPESAFE_API_URL) {
    return TYPESAFE_API_URL;
  }

  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(override)) {
    console.warn(`Using local TypeSafe test server at ${override}`);
    return override;
  }

  throw new Error(`Refusing to send the API key to TYPESAFE_BASE_URL=${override}`);
}

let client: TypeSafeClient | null = null;

function getClient(): TypeSafeClient {
  if (!process.env.TYPESAFE_API_KEY) {
    throw new Error("TYPESAFE_API_KEY is not set. Add it to .env (see .env.example).");
  }

  // logLevel "warn" keeps request bodies and headers out of the logs.
  client ??= new TypeSafeClient({ baseURL: resolveBaseURL(), logLevel: "warn" });
  return client;
}

// The Vite dev server runs on a different port, so allow local dev origins only.
function allowLocalOrigin(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("Request body too large");
    }
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.slice(0, MAX_TEXT) : fallback;
}

function asLogItems(value: unknown): CoachLogItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_ITEMS)
    .map((item) => ({ text: asString(item?.text).trim(), time: asString(item?.time) }))
    .filter((item) => item.text.length > 0);
}

function parseCoachRequest(raw: unknown): CoachRequest {
  const body = (raw ?? {}) as Record<string, unknown>;
  const today = (body.today ?? {}) as Record<string, unknown>;

  return {
    localTime: asString(body.localTime),
    dayOfWeek: asString(body.dayOfWeek),
    today: {
      weightEntries: asLogItems(today.weightEntries),
      exerciseEntries: asLogItems(today.exerciseEntries),
      foodEntries: asLogItems(today.foodEntries),
    },
    recentWeighIns: Array.isArray(body.recentWeighIns)
      ? body.recentWeighIns
          .slice(0, 14)
          .map((item) => ({ dateKey: asString(item?.dateKey), text: asString(item?.text) }))
          .filter((item) => item.text.length > 0)
      : [],
  };
}

const MAX_USER_TEXT = 2000;

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.slice(0, 14).filter((item): item is number => asNumber(item) !== null)
    : [];
}

// Accept the weather only if every field JevLens sends is present and well-formed.
function parseWeather(raw: unknown): WeatherContext | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const w = raw as Record<string, unknown>;
  const numbers = ["temperatureF", "feelsLikeF", "precipitationProbability", "precipitationMm", "windMph", "weatherCode"];
  if (!numbers.every((key) => asNumber(w[key]) !== null)) {
    return null;
  }
  if (typeof w.isDay !== "boolean" || typeof w.outdoorFriendly !== "boolean" || typeof w.condition !== "string") {
    return null;
  }

  return {
    temperatureF: w.temperatureF as number,
    feelsLikeF: w.feelsLikeF as number,
    precipitationProbability: w.precipitationProbability as number,
    precipitationMm: w.precipitationMm as number,
    windMph: w.windMph as number,
    weatherCode: w.weatherCode as number,
    condition: asString(w.condition).slice(0, 60),
    emoji: asString(w.emoji).slice(0, 8),
    isDay: w.isDay,
    outdoorFriendly: w.outdoorFriendly,
  };
}

// The Review payload is optional; malformed parts are dropped rather than rejected.
function parseReview(raw: unknown): ReviewPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const r = raw as Record<string, Record<string, unknown> | undefined>;
  const profile = r.profile ?? {};
  const weight = r.weight ?? {};
  const activity = r.activity ?? {};
  const engagement = r.engagement ?? {};
  const list = (value: unknown) => (Array.isArray(value) ? value.slice(0, MAX_ITEMS) : []);

  return {
    user_id: "", // not needed for analysis, so never forwarded
    date: asString(r.date).slice(0, 10),
    profile: {
      goal_weight_lbs: asNumber(profile.goal_weight_lbs) ?? 0,
      starting_weight_lbs: asNumber(profile.starting_weight_lbs) ?? 0,
      daily_step_goal: asNumber(profile.daily_step_goal) ?? 0,
    },
    weight: {
      today_lbs: asNumber(weight.today_lbs),
      yesterday_lbs: asNumber(weight.yesterday_lbs),
      seven_day_avg_lbs: asNumber(weight.seven_day_avg_lbs),
      last_7_entries_lbs: asNumberArray(weight.last_7_entries_lbs),
    },
    food_log_today: list(r.food_log_today)
      .map((item) => ({ time: asString(item?.time).slice(0, 5), entry: asString(item?.entry).trim() }))
      .filter((item) => item.entry.length > 0),
    exercise_log_today: list(r.exercise_log_today)
      .map((item) => ({
        type: typeof item?.type === "string" ? asString(item.type) : null,
        duration_min: asNumber(item?.duration_min),
        entry: asString(item?.entry).trim(),
      }))
      .filter((item) => item.entry.length > 0),
    activity: {
      steps_so_far_today: asNumber(activity.steps_so_far_today),
      avg_steps_last_7_days: asNumber(activity.avg_steps_last_7_days),
      sleep_hours_last_night: asNumber(activity.sleep_hours_last_night),
    },
    engagement: {
      current_logging_streak_days: asNumber(engagement.current_logging_streak_days) ?? 0,
      days_since_last_weigh_in: asNumber(engagement.days_since_last_weigh_in),
    },
  };
}

function parseLensRequest(raw: unknown): JevLensRequest {
  const body = (raw ?? {}) as Record<string, unknown>;
  const userText = typeof body.userText === "string" ? body.userText.trim().slice(0, MAX_USER_TEXT) : "";
  if (!userText) {
    throw new Error("userText is required");
  }

  return { userText, weather: parseWeather(body.weather), review: parseReview(body.review) };
}

function localTimeLabel(now = new Date()): string {
  const day = now.toLocaleDateString("en-US", { weekday: "long" });
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return `${day} ${time}`;
}

function sendApiError(res: ServerResponse, error: unknown) {
  if (error instanceof AuthenticationError) {
    sendJson(res, 502, { error: "TypeSafe rejected the API key. Check TYPESAFE_API_KEY in .env." });
    return;
  }

  if (error instanceof APIError) {
    console.error(`TypeSafe API error ${error.status}: ${error.message}`);
    sendJson(res, 502, { error: `TypeSafe API error (${error.status}). See server logs.` });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error(message);
  sendJson(res, 500, { error: message });
}

async function handleLens(req: IncomingMessage, res: ServerResponse) {
  let request: JevLensRequest;
  try {
    request = parseLensRequest(JSON.parse(await readBody(req)));
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid request" });
    return;
  }

  try {
    sendJson(res, 200, await runLens(getClient, request, localTimeLabel()));
  } catch (error) {
    sendApiError(res, error);
  }
}

const server = createServer(async (req, res) => {
  allowLocalOrigin(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, { ok: true, hasApiKey: Boolean(process.env.TYPESAFE_API_KEY) });
    return;
  }

  if (req.method === "POST" && req.url === "/api/jev") {
    await handleLens(req, res);
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/coach") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  let request: CoachRequest;
  try {
    request = parseCoachRequest(JSON.parse(await readBody(req)));
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid request" });
    return;
  }

  try {
    sendJson(res, 200, await runCoach(getClient, request));
  } catch (error) {
    sendApiError(res, error);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`HitTheGym API listening on http://127.0.0.1:${PORT}`);
  if (!process.env.TYPESAFE_API_KEY) {
    console.warn("TYPESAFE_API_KEY is not set; /api/coach will return an error until it is.");
  }
});
