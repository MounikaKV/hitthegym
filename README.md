# HitTheGym

**Directions, not stories.** Log your day, get a verdict and up to three things to do next.
Powered by [Jev](https://docs.typesafe.ai) (TypeSafe System One).

React + TypeScript + Vite.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Routes

| Route       | What it is                                                             |
| ----------- | ---------------------------------------------------------------------- |
| `/`         | App home (with bottom nav: Landing, Entry, Stats, Settings)            |
| `/entry`    | Input: log weight, exercise and food                                    |
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
