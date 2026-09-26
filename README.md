# HitTheGym

**Directions, not stories.** Log your day, get a verdict and up to three things to do next.
Powered by [Jev](https://docs.typesafe.ai) (TypeSafe System One).

React + TypeScript + Vite.

The Entry screen is JevLens: "Your day in. What matters out." Weather is optional context for a Jev decision, not a prerequisite for submitting a day.

## Jev integration

Provide a server-side `POST /api/jev` endpoint. The browser sends JSON `{ "userText": string, "weather": WeatherContext | null }`; `weather` is null when location is denied, unsupported, pending, or the forecast fails. Do not put Jev credentials in Vite environment variables or frontend code. During local development, route `/api/jev` to your backend using your server or a Vite proxy. Without that endpoint the UI shows "Jev is unavailable" instead of inventing a recommendation.

The endpoint must return JSON in this shape:

```json
{
	"signals": ["long_work_period", "low_movement"],
	"decision": { "useWeather": false, "intervention": "indoor_reset" },
	"reason": "The user's day suggests a brief reset.",
	"recommendation": "Take a brief break from your desk.",
	"avoided": ["calorie_estimate"]
}
```

Instruct Jev to first identify what matters in the user's day, then use weather only when it materially improves the single recommended nudge. Inactive or exhausted users may need rest even if the weather is pleasant; a long indoor workday may warrant an outdoor break in favorable conditions or an indoor reset in rain. Do not invent calories, measurements, medical diagnoses, health claims, or exercise prescriptions. Return one recommendation and a truthful decision trace based on the actual input. The client does not implement these decisions itself.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

## Routes

| Route       | What it is                                                             |
| ----------- | ---------------------------------------------------------------------- |
| `/`         | App home (with bottom nav: Landing, Entry, Stats, Settings)            |
| `/entry`    | Input: log weight, exercise and food                                    |
| `/review`   | The day's data package for Jev, plus **Get my verdict →**              |
| `/pitch`    | Pitch / landing page. Every "Try it" button goes to `/entry`           |
| `/result`   | Output page. Renders any Jev response it's handed                       |

`/pitch` and `/result` sit outside the app shell and use their own stylesheet (`src/styles/pitch.css`, scoped under `.htg`).

## Flow

1. The input app builds the day's state (see `DailyState` in `src/types/jev.ts`).
2. It POSTs to `https://api.typesafe.ai/v1/systemone` with `model: "jev-latest"` and the
   questions in `src/data/questions.ts` (same keys, since the output page reads answers by key).
3. It redirects here with Jev's response, and optionally the day (adds concrete numbers such as steps left and pounds to go).

### Redirecting to the output page

From anywhere (same app or another origin):

```js
const payload = { jev: jevResponse, day: dailyState };  // `day` optional
const d = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
window.location.href = `${OUTPUT_SITE}/result?d=${d}`;
```

From inside this app: `navigate('/result', { state: { jev, day } })`.

`jev` can be the full API response (`{ model, answers, usage }`) or just the `answers` map.
Missing or malformed answers are skipped, so the page still renders with a partial set.

## How answers become directions

`src/utils/briefing.ts`:

- **Verdict** comes from `message_tone`: celebratory → *Crushing it.*, encouraging → *On track.*,
  corrective_gentle → *Drifting.*, corrective_direct → *Off track.*, neutral → *Early days.*
- **Directions** (max 3, most urgent first) come from `needs_step_push`, `log_completeness`,
  `day_alignment`, `nutrient_focus`, `exercise_intensity`, and sleep from the state.
- **Tiles**: weight trend, food, exercise, steps.
- `weigh_in_plausible` < 0.5 shows a "re-weigh" alert.
- Anything Jev answered with confidence < 0.5 is marked **likely** (dashed).

## Deploy (pitch only)

Vercel hosts just the pitch page. The project has `VITE_PITCH_ONLY=true` set for Production, which makes
every path render the pitch page at `/`, and points its buttons (Try it, See a result, the examples) at the app
running locally (`VITE_LOCAL_APP_URL`, default `http://localhost:5173`). The input and result pages are not in
that build. Run `npm run dev` on the demo laptop for the rest of the flow.

## Showing local Jev runs

With `npm run dev` running, open `/result` with nothing passed in and it shows the **newest `.json` file in
`jev-output/`** (by modified time). Write each Jev run there, e.g. `jev-output/2026-09-26T08-00.json`.

- The file can be Jev's raw response (`{ model, answers, usage }`), or `{ "jev": <response>, "day": <state> }`
  to also show steps left, pounds to go and the progress bar.
- If the folder is empty, `src/data/jev-seed.json` is copied in as `jev-seed.json`.
- The page updates live when a new file lands. No refresh needed.
- Invalid or half-written files are skipped in favor of the next newest.
- Change the folder with `JEV_OUTPUT_DIR=path npm run dev`. `jev-output/` is gitignored.

A result passed explicitly (router state or `?d=`) still takes priority over the folder.

## End-to-end flow (local)

1. Log the day on `/entry`.
2. On `/review`, press **Get my verdict →**. The day's payload is saved to `jev-input/latest.json`
   (plus a timestamped copy) and the app opens `/result`, which shows "Asking Jev…".
3. Jev produces a run in `jev-output/`:
   - **Automatically**, if `TYPESAFE_API_KEY=...` is in `.env.local`: the dev server calls Jev with the
     questions in `src/data/questions.ts` and writes `{ jev, day }` to `jev-output/run-<time>.json`.
   - **Or** any local Jev script that reads `jev-input/latest.json` and writes its response to `jev-output/`.
4. `/result` picks up the first run newer than the click and shows it with the day's numbers.

The API key stays on the dev server (never sent to the browser).
