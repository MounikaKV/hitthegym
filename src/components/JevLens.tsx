import { useMemo, useState } from "react";
import WeatherCard from "./WeatherCard";
import { callJev, type JevResult } from "../services/jev";
import type { DailyEntry, LogEntry } from "../types/entry";
import type { WeatherContext } from "../types/weather";

function label(value: string) {
  return value.replaceAll("_", " ");
}

interface JevLensProps {
  entry: Pick<DailyEntry, "weightEntries" | "exerciseEntries" | "foodEntries">;
  timeOfDaySentence: string;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSection(name: string, entries: LogEntry[]): string {
  if (entries.length === 0) {
    return `${name}: none logged`;
  }

  const lines = entries
    .slice(0, 6)
    .map((entry) => `- ${formatTime(entry.createdAt)} ${entry.text}`)
    .join("\n");

  return `${name}:\n${lines}`;
}

function buildDigestText(
  entry: Pick<DailyEntry, "weightEntries" | "exerciseEntries" | "foodEntries">,
  timeOfDaySentence: string,
): string {
  return [
    `Context: ${timeOfDaySentence}`,
    formatSection("Weight", entry.weightEntries),
    formatSection("Exercise", entry.exerciseEntries),
    formatSection("Food", entry.foodEntries),
  ].join("\n\n");
}

export default function JevLens({ entry, timeOfDaySentence }: JevLensProps) {
  const [weather, setWeather] = useState<WeatherContext | null>(null);
  const [result, setResult] = useState<JevResult | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasAnyLogs =
    entry.weightEntries.length > 0 ||
    entry.exerciseEntries.length > 0 ||
    entry.foodEntries.length > 0;

  const digestText = useMemo(
    () => buildDigestText(entry, timeOfDaySentence),
    [entry, timeOfDaySentence],
  );

  async function submitDay() {
    if (!hasAnyLogs || submitting) return;
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      setResult(await callJev({ userText: digestText, weather }));
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message.startsWith("Jev ")
          ? failure.message
          : "Jev is unavailable right now. Please try again later.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="jev-lens card card--soft" aria-label="JevLens">
      <h2>JevLens</h2>
      <p>Uses your logged entries, time of day, and local weather.</p>

      <div className="jev-context-strip" aria-label="Jev context summary">
        <span className="chip">{timeOfDaySentence}</span>
        <span className="chip">{entry.weightEntries.length} weigh-ins</span>
        <span className="chip">
          {entry.exerciseEntries.length} exercise logs
        </span>
        <span className="chip">{entry.foodEntries.length} food logs</span>
      </div>

      <button
        type="button"
        className="jev-trigger"
        onClick={submitDay}
        disabled={submitting || !hasAnyLogs}
      >
        {submitting ? "Thinking..." : "Get my nudge"}
      </button>

      {!hasAnyLogs && (
        <p className="entry-error" role="status">
          Add at least one entry to run JevLens.
        </p>
      )}

      {error && (
        <p className="entry-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <section className="jev-result card" aria-label="Jev's nudge">
          <span className="jev-eyebrow">Jev's nudge</span>
          <h2>{result.recommendation}</h2>
          <details className="jev-trace">
            <summary>Why this suggestion?</summary>
            <div className="jev-trace-body">
              <h3>Signals detected</h3>
              {result.signals.length ? (
                <ul>
                  {result.signals.map((signal, index) => (
                    <li key={`${signal}-${index}`}>{label(signal)}</li>
                  ))}
                </ul>
              ) : (
                <p>No signals reported.</p>
              )}
              <h3>Decision</h3>
              <p>{label(result.decision.intervention)}</p>
              <h3>Weather used</h3>
              <p>{result.decision.useWeather ? "Yes" : "No"}</p>
              <h3>Why</h3>
              <p>{result.reason}</p>
              {result.avoided.length > 0 && (
                <>
                  <h3>Jev avoided</h3>
                  <ul>
                    {result.avoided.map((item, index) => (
                      <li key={`${item}-${index}`}>{label(item)}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </details>
        </section>
      )}

      <details className="jev-trace">
        <summary>Preview analyzed input</summary>
        <pre className="json-block jev-digest-preview">{digestText}</pre>
      </details>

      <WeatherCard onWeatherLoaded={setWeather} />
    </section>
  );
}
