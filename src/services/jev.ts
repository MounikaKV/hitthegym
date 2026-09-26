import type { WeatherContext } from "../types/weather";

export interface JevInput {
  userText: string;
  weather: WeatherContext | null;
}

export interface JevResult {
  signals: string[];
  decision: {
    useWeather: boolean;
    intervention: string;
  };
  reason: string;
  recommendation: string;
  avoided: string[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isJevResult(value: unknown): value is JevResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  const decision = result.decision;
  return isStringArray(result.signals) && isStringArray(result.avoided) &&
    typeof result.reason === "string" && typeof result.recommendation === "string" &&
    result.recommendation.trim().length > 0 &&
    !!decision && typeof decision === "object" &&
    typeof (decision as Record<string, unknown>).useWeather === "boolean" &&
    typeof (decision as Record<string, unknown>).intervention === "string";
}

export async function callJev(input: JevInput): Promise<JevResult> {
  const response = await fetch("/api/jev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Jev is unavailable right now. Please try again later.");
  }

  const result: unknown = await response.json();
  if (!isJevResult(result)) {
    throw new Error("Jev returned an invalid decision. Please try again later.");
  }
  return result;
}