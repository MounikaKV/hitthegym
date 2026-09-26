# HitTheGym

TypeScript + React application scaffolded with Vite.

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
npm run dev
```

## Scripts

- `npm run dev` - start development server
- `npm run build` - type-check and build production bundle
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint
