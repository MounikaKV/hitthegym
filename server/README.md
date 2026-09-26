# Jev analysis API

A small Node server that analyzes the user's day with
[TypeSafe's Jev](https://docs.typesafe.ai). It keeps the TypeSafe API key out of the browser.

## Run it

```bash
cp .env.example .env   # then set TYPESAFE_API_KEY
npm run dev:server     # http://127.0.0.1:8787
npm run dev            # in another terminal; Vite proxies /api to the server
```

## POST /api/jev (used by JevLens)

Implements the contract in the main README. JevLens's `callJev()` sends:

```json
{ "userText": "Worked from home for 8 hours...", "weather": { "...": "WeatherContext or null" } }
```

It can also send the day's logged data as an optional `review` field, the output of
`buildReviewPayload()` from `src/services/reviewData.ts`:

```json
{ "userText": "...", "weather": null, "review": { "...": "ReviewPayload" } }
```

When `review` is present, Jev also sees the weight trend, goal progress, today's food and
exercise logs and the logging streak. Without it, Jev decides from the text and weather only.

The response:

```json
{
  "signals": ["long_work_period", "low_movement"],
  "decision": { "useWeather": true, "intervention": "outdoor_walk" },
  "reason": "Jev noticed long work period, low movement, and picked \"outdoor walk\" (70%). The weather shaped this suggestion.",
  "recommendation": "It's mainly clear and 71°F. A good moment for a 10-minute walk outside.",
  "avoided": ["calorie_estimate", "medical_diagnosis", "exercise_prescription"],
  "jev": { "model": "jev-1.13.0", "latencyMs": 210, "inputTokens": 1100, "answers": [] }
}
```

`jev` is extra debugging detail; JevLens ignores it.

How it decides (`lens.ts`):

1. Code turns the weather and review numbers into plain facts.
2. One Jev request asks for 8 signals (long work period, low movement, already active,
   fatigue, stress, skipped meal, indulgent food, positive progress), a safety check,
   whether the weather matters, and which intervention fits best.
3. Code applies the rules: the safety check comes first; an outdoor walk is never suggested
   in poor weather or at night; the recommendation is pre-written, so Jev never invents
   calories, measurements or medical claims.

Interventions: `outdoor_walk`, `indoor_reset`, `rest_recover`, `balanced_meal`, `hydrate`,
`stress_break`, `celebrate`, and `seek_support` (safety check only).

## POST /api/coach (log-based coach)

`src/services/coachApi.ts` reads the Entry page's saved data (read-only) and calls this
endpoint. Components call `analyzeToday()`; the response shape is in `src/types/coach.ts`.

## Checks

`npm run typecheck:server` type-checks the server against the frontend's own types
(`JevInput`, `JevResult`, `WeatherContext`, `ReviewPayload`), so a contract change on
either side fails the check.
