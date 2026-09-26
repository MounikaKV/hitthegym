import type { Questions, TypeSafeClient } from "@typesafe-ai/sdk";
// The frontend's own types, so the compiler keeps this endpoint in step with JevLens.
import type { JevInput, JevResult } from "../src/services/jev.ts";
import type { ReviewPayload } from "../src/types/review.ts";
import type { WeatherContext } from "../src/types/weather.ts";
import type { JevAnswerSummary } from "../src/types/coach.ts";
import { noul, percent, summarize, THRESHOLDS, type Answer } from "./coach.ts";

// POST /api/jev: JevLens sends what the user wrote and the weather, plus
// (optionally) the day's logged data from buildReviewPayload(). Code turns the
// numbers into facts, Jev judges what matters and picks one intervention, and
// code applies the rules and writes the reply in the shape JevLens expects.

export interface JevLensRequest extends JevInput {
  review: ReviewPayload | null;
}

export interface JevLensResponse extends JevResult {
  // Extra detail for debugging and demos; JevLens ignores it.
  jev: { model: string; latencyMs: number; inputTokens: number; answers: JevAnswerSummary[] };
}

interface Intervention {
  criteria: string;
  recommendation: (weather: WeatherContext | null) => string;
  // Weather this intervention depends on, if any.
  needsWeather?: "outdoor" | "indoor";
}

const INTERVENTIONS: Record<string, Intervention> = {
  outdoor_walk: {
    criteria:
      "A short walk outside: the user has been inactive or sitting a long time, has energy, and the weather in `facts.weather` is pleasant",
    recommendation: (weather) =>
      weather
        ? `It's ${weather.condition.toLowerCase()} and ${Math.round(weather.temperatureF)}°F. A good moment for a 10-minute walk outside.`
        : "Take a 10-minute walk outside.",
    needsWeather: "outdoor",
  },
  indoor_reset: {
    criteria:
      "A brief indoor movement break: the user has been sitting a long time and needs to move, but going outside is not a good fit",
    recommendation: (weather) =>
      weather && !weather.outdoorFriendly
        ? `With ${weather.condition.toLowerCase()} outside, take a 5-minute indoor break: stand up, stretch and walk around.`
        : "Take a 5-minute break: stand up, stretch and walk around.",
    needsWeather: "indoor",
  },
  rest_recover: {
    criteria:
      "Rest and recovery: the user sounds exhausted, sore, sick, poorly slept, or already trained hard today",
    recommendation: () => "Take it easy today. Rest, drink some water and aim for an earlier night.",
  },
  balanced_meal: {
    criteria:
      "A food nudge: the user skipped a meal or ate mostly indulgent food, and a balanced next meal would help most",
    recommendation: () => "Make your next meal a balanced one, with some protein and vegetables.",
  },
  hydrate: {
    criteria: "A hydration nudge: the user mentions alcohol, heat, a headache, or not drinking water",
    recommendation: () => "Have a glass of water now, and keep one nearby.",
  },
  stress_break: {
    criteria: "A calm-down break: the user sounds stressed, anxious or overwhelmed",
    recommendation: () => "Pause for two minutes: slow breaths, shoulders down, then carry on.",
  },
  celebrate: {
    criteria: "Encouragement: the user is doing well, such as exercising, eating well, or making progress toward their goal",
    recommendation: () => "Nice work today. Keep the streak going.",
  },
};

const SUPPORT_RECOMMENDATION =
  "It might help to talk to a doctor, a dietitian or someone you trust about how you're feeling.";

// What this endpoint never produces. Listed in every trace, because it's true by design.
const ALWAYS_AVOIDED = ["calorie_estimate", "medical_diagnosis", "exercise_prescription"];

const SIGNALS: Record<string, string> = {
  long_work_period: "Does the user describe a long stretch of work, study or screen time?",
  low_movement: "Has the user moved very little today, based on `user_text` and `logs`?",
  already_active: "Has the user already exercised or been physically active today?",
  fatigue: "Does the user sound tired, exhausted, sore, unwell or short on sleep?",
  stress: "Does the user sound stressed, anxious or overwhelmed?",
  skipped_meal: "Does it look like the user skipped a meal today?",
  indulgent_food: "Did the user eat or drink something indulgent, such as fast food, sweets or alcohol?",
  positive_progress: "Does the user describe progress or a good day toward their health goals?",
};

// ---------------------------------------------------------------------------
// Facts computed in code
// ---------------------------------------------------------------------------

function describeWeather(weather: WeatherContext): string {
  const rain = Math.round(weather.precipitationProbability);
  return (
    `${weather.condition}, ${Math.round(weather.temperatureF)}°F (feels like ${Math.round(weather.feelsLikeF)}°F), ` +
    `${rain}% chance of rain, wind ${Math.round(weather.windMph)} mph, ${weather.isDay ? "daytime" : "night"}, ` +
    `${weather.outdoorFriendly ? "good" : "not good"} for being outside`
  );
}

function describeReview(review: ReviewPayload): Record<string, string> {
  const facts: Record<string, string> = {};
  const { weight, profile, engagement } = review;

  if (weight.today_lbs !== null) {
    facts.weight_today = `${weight.today_lbs} lbs`;
  }

  // last_7_entries_lbs is newest first.
  const series = [...weight.last_7_entries_lbs].reverse();
  if (series.length >= 3) {
    const change = Math.round((series[series.length - 1] - series[0]) * 10) / 10;
    facts.weight_trend =
      Math.abs(change) < 0.5
        ? `flat over the last ${series.length} weigh-ins`
        : `${change < 0 ? "down" : "up"} ${Math.abs(change)} lbs over the last ${series.length} weigh-ins`;
  }

  const current = weight.today_lbs ?? weight.last_7_entries_lbs[0];
  const toLose = profile.starting_weight_lbs - profile.goal_weight_lbs;
  if (current !== undefined && toLose > 0) {
    const lost = Math.round((profile.starting_weight_lbs - current) * 10) / 10;
    facts.goal_progress = `${lost} of ${toLose} lbs toward the goal weight`;
  }

  facts.logs_today = `${review.food_log_today.length} meals, ${review.exercise_log_today.length} workouts`;
  facts.logging_streak = `${engagement.current_logging_streak_days} days`;
  if (review.activity.sleep_hours_last_night !== null) {
    facts.sleep_last_night = `${review.activity.sleep_hours_last_night} hours`;
  }

  return facts;
}

function buildState(request: JevLensRequest, localTime: string) {
  const facts: Record<string, string> = { local_time: localTime };
  if (request.weather) {
    facts.weather = describeWeather(request.weather);
  }

  const review = request.review;
  if (review) {
    Object.assign(facts, describeReview(review));
  }

  return {
    user_text: request.userText,
    facts,
    logs: review
      ? {
          food_today: review.food_log_today.map((item) => `${item.time} ${item.entry}`),
          exercise_today: review.exercise_log_today.map((item) => item.entry),
        }
      : "No logged data was provided.",
  };
}

// ---------------------------------------------------------------------------
// Jev questions
// ---------------------------------------------------------------------------

function buildQuestions(): Questions {
  const questions: Questions = {};

  for (const [id, instructions] of Object.entries(SIGNALS)) {
    questions[`signal_${id}`] = { type: "noul", instructions };
  }

  questions.concerning = {
    type: "noul",
    instructions:
      "Does `user_text` or `logs` suggest something worth flagging for professional support, such as eating very little, extreme exercise, self-harm, or signs of disordered eating?",
  };

  questions.weather_matters = {
    type: "noul",
    instructions:
      "Would `facts.weather` materially change which single nudge is best for this user right now? Weather does not matter if the user needs rest, food or calm regardless of conditions.",
  };

  questions.intervention = {
    type: "choice",
    instructions: {
      question:
        "Given `user_text`, `logs` and `facts`, which single nudge would help this user most right now?",
      guidance:
        "First decide what matters in the user's day, then use the weather only if it improves the nudge. Inactive or exhausted users may need rest even when the weather is pleasant; a long indoor workday may call for an outdoor break in good weather or an indoor reset in bad weather.",
    },
    criteria: Object.fromEntries(Object.entries(INTERVENTIONS).map(([id, item]) => [id, item.criteria])),
  };

  return questions;
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

function decide(request: JevLensRequest, answers: Record<string, Answer>): JevResult {
  const signals = Object.keys(SIGNALS).filter(
    (id) => (noul(answers, `signal_${id}`) ?? 0) >= THRESHOLDS.flag,
  );
  const avoided = [...ALWAYS_AVOIDED];

  const concerning = noul(answers, "concerning") ?? 0;
  if (concerning >= THRESHOLDS.concerning) {
    return {
      signals,
      decision: { useWeather: false, intervention: "seek_support" },
      reason: `The safety check flagged what you shared (${percent(concerning)}), so Jev suggests support instead of a fitness nudge.`,
      recommendation: SUPPORT_RECOMMENDATION,
      avoided: [...avoided, "fitness_nudge"],
    };
  }

  const answer = answers.intervention;
  // Jev returns a distribution over every option; most likely first.
  const ranked =
    answer?.type === "choice"
      ? Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1])
      : [["indoor_reset", 1] as [string, number]];

  const weather = request.weather;
  let chosen = ranked[0][0];
  const probability = ranked[0][1];
  let picked = `picked "${chosen.replaceAll("_", " ")}" (${percent(probability)})`;

  // Code-side guard: never send someone outside in bad weather or at night.
  if (chosen === "outdoor_walk" && weather && (!weather.outdoorFriendly || !weather.isDay)) {
    avoided.push("outdoor_suggestion_in_poor_conditions");
    chosen = "indoor_reset";
    picked = `preferred an outdoor walk (${percent(probability)}), but conditions outside aren't good, so it's an indoor reset instead`;
  }

  const intervention = INTERVENTIONS[chosen] ?? INTERVENTIONS.indoor_reset;
  const weatherMatters = (noul(answers, "weather_matters") ?? 0) >= 0.5;
  const useWeather =
    weather !== null &&
    intervention.needsWeather !== undefined &&
    (intervention.needsWeather === "outdoor" ? weather.outdoorFriendly : !weather.outdoorFriendly) &&
    weatherMatters;

  const signalText = signals.length ? signals.map((id) => id.replaceAll("_", " ")).join(", ") : "no strong signals";
  const weatherText = !weather
    ? "No weather was available."
    : useWeather
      ? "The weather shaped this suggestion."
      : "The weather didn't change the suggestion.";

  return {
    signals,
    decision: { useWeather, intervention: chosen },
    reason: `Jev noticed ${signalText}, and ${picked}. ${weatherText}`,
    recommendation: intervention.recommendation(useWeather ? weather : null),
    avoided,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function runLens(
  getClient: () => TypeSafeClient,
  request: JevLensRequest,
  localTime: string,
): Promise<JevLensResponse> {
  const started = performance.now();
  const response = await getClient().systemOne({
    state: buildState(request, localTime),
    questions: buildQuestions(),
  });
  const latencyMs = Math.round(performance.now() - started);
  const answers = response.answers as unknown as Record<string, Answer>;

  return {
    ...decide(request, answers),
    jev: {
      model: response.model,
      latencyMs,
      inputTokens: response.usage.input_tokens,
      answers: summarize(answers),
    },
  };
}
