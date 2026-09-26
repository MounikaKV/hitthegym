# Jev analysis API

A small Node server that analyzes the day's logged entries with
[TypeSafe's Jev](https://docs.typesafe.ai). It keeps the TypeSafe API key out of the browser.

## Run it

```bash
cp .env.example .env   # then set TYPESAFE_API_KEY
npm run dev:server     # http://127.0.0.1:8787
```

Run the frontend (`npm run dev`) in another terminal as usual.

## Use it from a component

```ts
import { analyzeToday } from "../services/coachApi";
import type { CoachResponse } from "../types/coach";

const analysis: CoachResponse = await analyzeToday();
```

`analyzeToday()` reads today's entries from the Entry page's storage (read-only),
adds the last 7 days of weigh-ins, and calls `POST /api/coach`. To analyze a
`DailyEntry` you already have in state, use `analyzeDay(day)`.

The response (`src/types/coach.ts`):

| Field | Meaning |
|---|---|
| `status` | `"message"`, `"quiet"` (coach chose not to speak), `"support"` (safety check fired) or `"welcome"` (nothing logged yet) |
| `message` | `{ id, title, text }` to show, or `null` when quiet |
| `reason` | One sentence on why the coach decided this |
| `insights` | Short labels, e.g. `{ label: "Alcohol", value: "95%" }` |
| `facts` | What code computed: weight trend, weigh-in check, counts |
| `jev` | Whether Jev was called, model, latency, tokens, and every answer with probabilities |

Set `VITE_COACH_API_URL` if the server runs somewhere other than `http://127.0.0.1:8787`.

## How the analysis works (`coach.ts`)

1. Code computes the numbers: weight parsing (lb/kg), trend, typo check.
2. One Jev request asks: food quality, workout intensity, low protein, low fiber,
   alcohol, treat meal, missing meal, a safety check, whether to message now, and
   which pre-written message fits best.
3. Code applies the rules: safety first, stay quiet when Jev isn't confident, and
   never pick a message the logs don't support. Tune `THRESHOLDS` on real examples.

`npm run typecheck:server` type-checks the server.
