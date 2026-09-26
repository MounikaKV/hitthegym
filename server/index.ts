import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { APIError, AuthenticationError, TypeSafeClient } from "@typesafe-ai/sdk";
import type { CoachLogItem, CoachRequest } from "../src/types/coach.ts";
import { runCoach } from "./coach.ts";

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
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`HitTheGym API listening on http://127.0.0.1:${PORT}`);
  if (!process.env.TYPESAFE_API_KEY) {
    console.warn("TYPESAFE_API_KEY is not set; /api/coach will return an error until it is.");
  }
});
