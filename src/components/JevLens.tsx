import { useMemo } from "react";
import WeatherCard from "./WeatherCard";
import type { DailyEntry, LogEntry } from "../types/entry";

// Stable no-op: WeatherCard re-fetches whenever this callback changes.
function ignoreWeather() {}

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
  const digestText = useMemo(
    () => buildDigestText(entry, timeOfDaySentence),
    [entry, timeOfDaySentence],
  );

  return (
    <section className="jev-lens card card--soft" aria-label="HitTheGym">
      <h2>HitTheGym</h2>
      <p>Uses your logged entries, time of day, and local weather.</p>

      <div className="jev-context-strip" aria-label="Jev context summary">
        <span className="chip">{timeOfDaySentence}</span>
        <span className="chip">{entry.weightEntries.length} weigh-ins</span>
        <span className="chip">
          {entry.exerciseEntries.length} exercise logs
        </span>
        <span className="chip">{entry.foodEntries.length} food logs</span>
      </div>

      <details className="jev-trace">
        <summary>Preview analyzed input</summary>
        <pre className="json-block jev-digest-preview">{digestText}</pre>
      </details>

      <WeatherCard onWeatherLoaded={ignoreWeather} />
    </section>
  );
}
