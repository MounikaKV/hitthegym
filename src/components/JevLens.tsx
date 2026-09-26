import { useState, type FormEvent } from "react";
import WeatherCard from "./WeatherCard";
import { callJev, type JevResult } from "../services/jev";
import type { WeatherContext } from "../types/weather";

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default function JevLens() {
  const [userText, setUserText] = useState("");
  const [weather, setWeather] = useState<WeatherContext | null>(null);
  const [result, setResult] = useState<JevResult | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userText.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      setResult(await callJev({ userText: userText.trim(), weather }));
    } catch (failure) {
      setError(failure instanceof Error && failure.message.startsWith("Jev ")
        ? failure.message
        : "Jev is unavailable right now. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="jev-lens" aria-label="HitTheGym">
      <h2>HitTheGym</h2>
      <p>Your day in. What matters out.</p>
      <form className="jev-form" onSubmit={submitDay}>
        <label htmlFor="day-entry">Tell us what happened. Jev decides what matters.</label>
        <textarea
          id="day-entry"
          value={userText}
          onChange={(event) => setUserText(event.target.value)}
          placeholder="Worked from home for 8 hours, had lunch, and haven't really moved..."
          rows={5}
          required
        />
        <button type="submit" disabled={submitting || !userText.trim()}>
          {submitting ? "Thinking..." : "Get my nudge"}
        </button>
      </form>

      {error && <p className="entry-error" role="alert">{error}</p>}
      {result && (
        <section className="jev-result" aria-label="Jev's nudge">
          <span className="jev-eyebrow">Jev's nudge</span>
          <h2>{result.recommendation}</h2>
          <details className="jev-trace">
            <summary>Why this suggestion?</summary>
            <div className="jev-trace-body">
              <h3>Signals detected</h3>
              {result.signals.length ? (
                <ul>{result.signals.map((signal, index) => <li key={`${signal}-${index}`}>{label(signal)}</li>)}</ul>
              ) : <p>No signals reported.</p>}
              <h3>Decision</h3>
              <p>{label(result.decision.intervention)}</p>
              <h3>Weather used</h3>
              <p>{result.decision.useWeather ? "Yes" : "No"}</p>
              <h3>Why</h3>
              <p>{result.reason}</p>
              {result.avoided.length > 0 && (
                <>
                  <h3>Jev avoided</h3>
                  <ul>{result.avoided.map((item, index) => <li key={`${item}-${index}`}>{label(item)}</li>)}</ul>
                </>
              )}
            </div>
          </details>
        </section>
      )}
      <WeatherCard onWeatherLoaded={setWeather} />
    </section>
  );
}