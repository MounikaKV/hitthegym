import type { Questions, TypeSafeClient } from "@typesafe-ai/sdk";
import type {
  CoachInsight,
  CoachMessage,
  CoachRequest,
  CoachResponse,
  JevAnswerSummary,
} from "../src/types/coach.ts";

// Code owns the numbers (weight parsing, trends); Jev owns the judgments
// (food quality, workout intensity, which message fits). Code owns the policy.

const MESSAGES: Record<string, { title: string; text: string; criteria: string }> = {
  celebrate_trend: {
    title: "Nice trend",
    text: "Your weight is moving the right way. Keep doing what you're doing.",
    criteria: "Celebrate a downward weight trend shown in `facts.weight_trend`",
  },
  celebrate_workout: {
    title: "Great workout",
    text: "You showed up and moved today. That's the habit that wins.",
    criteria: "Celebrate the exercise the user logged today",
  },
  no_guilt_treat: {
    title: "One meal won't undo it",
    text: "Enjoyed a treat? That's fine. One meal doesn't undo a good week. Back to normal next meal.",
    criteria: "Reassure the user after an indulgent meal, without guilt",
  },
  add_protein: {
    title: "Add some protein",
    text: "Try adding a protein source to your next meal: eggs, yogurt, chicken, tofu or beans.",
    criteria: "Nudge toward more protein because today's meals look low in protein",
  },
  add_veggies: {
    title: "Add some greens",
    text: "Your next meal is a good chance to add vegetables or fruit.",
    criteria: "Nudge toward vegetables, fruit or fiber because today's meals look low in them",
  },
  log_missing_meal: {
    title: "Missing a meal?",
    text: "Looks like a meal might be missing from today's log. Add it so your picture stays accurate.",
    criteria: "Remind the user to log a meal that seems to be missing for this time of day",
  },
  get_moving: {
    title: "Time to move",
    text: "No exercise logged yet today. Even a 15-minute walk counts.",
    criteria: "Encourage some activity because no exercise is logged yet and there is still time today",
  },
  go_easy_on_drinks: {
    title: "Easy on the drinks",
    text: "Drinks add up quickly. Try water between drinks and keep tomorrow's plan simple.",
    criteria: "Gently mention alcohol intake logged today",
  },
  none: {
    title: "",
    text: "",
    criteria: "No message fits well right now; the coach should stay quiet",
  },
};

const SUPPORT_MESSAGE: CoachMessage = {
  id: "support",
  title: "Take care of yourself",
  text:
    "Some of today's logs suggest it might help to talk to a doctor, dietitian or someone you trust. " +
    "HitTheGym is a tracker, not medical advice.",
};

const WELCOME_MESSAGE: CoachMessage = {
  id: "welcome",
  title: "Welcome back",
  text: "Log a weigh-in, a workout or a meal and your coach will check in.",
};

// Thresholds are starting points for the demo; tune them on real examples.
const THRESHOLDS = {
  concerning: 0.5,
  shouldNudge: 0.5,
  messageConfidence: 0.35,
  flag: 0.6,
};

// ---------------------------------------------------------------------------
// Facts computed in code
// ---------------------------------------------------------------------------

export function parseWeightLbs(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilo|kilos|kilograms?|lb|lbs|pounds?)?/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const unit = (match[2] ?? "lb").toLowerCase();
  const lbs = unit.startsWith("k") ? value * 2.20462 : value;

  return Math.round(lbs * 10) / 10;
}

function computeFacts(request: CoachRequest): Record<string, string> {
  const facts: Record<string, string> = {
    local_time: `${request.dayOfWeek} ${request.localTime}`,
    meals_logged_today: String(request.today.foodEntries.length),
    workouts_logged_today: String(request.today.exerciseEntries.length),
  };

  // Entries are stored newest first; the latest weigh-in is index 0.
  const todayWeight = request.today.weightEntries[0]
    ? parseWeightLbs(request.today.weightEntries[0].text)
    : null;
  const history = request.recentWeighIns
    .map((entry) => parseWeightLbs(entry.text))
    .filter((value): value is number => value !== null);

  if (todayWeight !== null) {
    facts.weight_today = `${todayWeight} lbs`;
  }

  const series = todayWeight !== null ? [...history, todayWeight] : history;
  if (series.length >= 3) {
    const change = Math.round((series[series.length - 1] - series[0]) * 10) / 10;
    const days = series.length;
    if (Math.abs(change) < 0.5) {
      facts.weight_trend = `flat: within 0.5 lbs over the last ${days} weigh-ins`;
    } else if (change < 0) {
      facts.weight_trend = `losing: down ${Math.abs(change)} lbs over the last ${days} weigh-ins`;
    } else {
      facts.weight_trend = `gaining: up ${change} lbs over the last ${days} weigh-ins`;
    }
  } else {
    facts.weight_trend = "not enough weigh-ins yet to tell";
  }

  if (todayWeight !== null && history.length > 0) {
    const jump = Math.abs(todayWeight - history[history.length - 1]);
    facts.weigh_in_check =
      jump > 4 ? `possible typo: ${jump.toFixed(1)} lbs from the previous weigh-in` : "plausible";
  }

  return facts;
}

// ---------------------------------------------------------------------------
// Jev questions
// ---------------------------------------------------------------------------

function buildQuestions(request: CoachRequest): Questions {
  const hasFood = request.today.foodEntries.length > 0;
  const hasExercise = request.today.exerciseEntries.length > 0;
  const questions: Questions = {};

  if (hasFood) {
    questions.food_quality = {
      type: "score",
      instructions:
        "Judging only the types of food in `today.food` (not the amount), how well do they support weight loss?",
      criteria: [
        "Mostly fried, processed or sugary foods, or alcohol",
        "Mixed: some whole foods, some processed or indulgent items",
        "Mostly whole foods with one indulgent item",
        "Almost entirely lean protein, vegetables and whole foods",
      ],
    };
    questions.low_protein = {
      type: "noul",
      instructions: "Are the meals in `today.food` low in protein for someone trying to lose weight?",
    };
    questions.low_fiber = {
      type: "noul",
      instructions: "Are the meals in `today.food` low in vegetables, fruit or fiber?",
    };
    questions.includes_alcohol = {
      type: "noul",
      instructions: "Does `today.food` include any alcoholic drink?",
    };
    questions.indulgent_meal = {
      type: "noul",
      instructions:
        "Does `today.food` include an indulgent meal or treat, such as pizza, fast food, dessert or a large takeout meal?",
    };
  }

  if (hasExercise) {
    questions.exercise_intensity = {
      type: "score",
      instructions: "Rate the intensity of the exercise described in `today.exercise`.",
      criteria: [
        "Light activity such as a short walk or stretching",
        "Moderate activity such as a brisk walk, easy jog or light cycling",
        "Vigorous activity such as a hard run, HIIT or heavy lifting",
      ],
    };
  }

  questions.meal_likely_missing = {
    type: "noul",
    instructions:
      "Given `facts.local_time` and the meal times in `today.food`, is it likely the user ate a meal they have not logged yet? A meal that simply has not happened yet does not count.",
  };

  questions.concerning_pattern = {
    type: "noul",
    instructions:
      "Do today's logs suggest something worth flagging for professional support, such as eating very little, extreme exercise, or signs of disordered eating?",
  };

  questions.should_nudge_now = {
    type: "noul",
    instructions:
      "Would a short, friendly coaching message right now be welcome and useful to this user, given `facts.local_time` and what they logged today?",
  };

  questions.best_message = {
    type: "choice",
    instructions:
      "Which coaching message would help this user most right now, given `facts` and `today`?",
    criteria: Object.fromEntries(
      Object.entries(MESSAGES).map(([id, message]) => [id, message.criteria]),
    ),
  };

  return questions;
}

function buildState(request: CoachRequest, facts: Record<string, string>) {
  const format = (items: { text: string; time: string }[]) =>
    [...items].reverse().map((item) => `${item.time} ${item.text}`);

  return {
    facts,
    today: {
      weigh_ins: format(request.today.weightEntries),
      exercise: format(request.today.exerciseEntries),
      food: format(request.today.foodEntries),
    },
  };
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

type Answer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> }
  | { type: "score"; score: number; confidence: number; probabilities: Record<string, number> };

function noul(answers: Record<string, Answer>, id: string): number | undefined {
  const answer = answers[id];
  return answer?.type === "noul" ? answer.noul : undefined;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function summarize(answers: Record<string, Answer>): JevAnswerSummary[] {
  return Object.entries(answers).map(([id, answer]) => {
    if (answer.type === "noul") {
      return { id, type: "noul", value: answer.noul.toFixed(2) };
    }

    if (answer.type === "choice") {
      return {
        id,
        type: "choice",
        value: `${answer.choice} (${percent(answer.probabilities[answer.choice] ?? 0)})`,
        confidence: answer.confidence,
        probabilities: answer.probabilities,
      };
    }

    return {
      id,
      type: "score",
      value: answer.score.toFixed(2),
      confidence: answer.confidence,
      probabilities: answer.probabilities,
    };
  });
}

function buildInsights(answers: Record<string, Answer>): CoachInsight[] {
  const insights: CoachInsight[] = [];

  const food = answers.food_quality;
  if (food?.type === "score") {
    insights.push({ label: "Food quality", value: `${food.score.toFixed(1)} / 3` });
  }

  const exercise = answers.exercise_intensity;
  if (exercise?.type === "score") {
    const levels = ["Light", "Moderate", "Vigorous"];
    insights.push({
      label: "Workout intensity",
      value: levels[Math.min(2, Math.max(0, Math.round(exercise.score)))],
    });
  }

  const flags: [string, string][] = [
    ["low_protein", "Low protein"],
    ["low_fiber", "Low fiber"],
    ["includes_alcohol", "Alcohol"],
    ["indulgent_meal", "Treat meal"],
    ["meal_likely_missing", "Meal may be missing"],
  ];
  for (const [id, label] of flags) {
    const value = noul(answers, id);
    if (value !== undefined && value >= THRESHOLDS.flag) {
      insights.push({ label, value: percent(value) });
    }
  }

  return insights;
}

function decide(
  request: CoachRequest,
  answers: Record<string, Answer>,
): Pick<CoachResponse, "status" | "message" | "reason"> {
  const concerning = noul(answers, "concerning_pattern") ?? 0;
  if (concerning >= THRESHOLDS.concerning) {
    return {
      status: "support",
      message: SUPPORT_MESSAGE,
      reason: `Safety check flagged today's logs (${percent(concerning)}), so diet nudges are paused.`,
    };
  }

  const shouldNudge = noul(answers, "should_nudge_now") ?? 0;
  if (shouldNudge < THRESHOLDS.shouldNudge) {
    return {
      status: "quiet",
      message: null,
      reason: `Jev thinks a message right now wouldn't help (${percent(shouldNudge)}), so the coach stays quiet.`,
    };
  }

  const best = answers.best_message;
  if (best?.type !== "choice" || best.choice === "none") {
    return { status: "quiet", message: null, reason: "No message fits right now." };
  }

  if (best.confidence < THRESHOLDS.messageConfidence) {
    return {
      status: "quiet",
      message: null,
      reason: `Jev wasn't sure which message fits (confidence ${percent(best.confidence)}), so the coach stays quiet.`,
    };
  }

  // Code-side guard: never pick a message the logs can't support.
  const hasExercise = request.today.exerciseEntries.length > 0;
  const hadTreat = (noul(answers, "indulgent_meal") ?? 0) >= THRESHOLDS.flag;
  const hadAlcohol = (noul(answers, "includes_alcohol") ?? 0) >= THRESHOLDS.flag;
  const unsupported =
    (best.choice === "celebrate_workout" && !hasExercise) ||
    (best.choice === "get_moving" && hasExercise) ||
    (best.choice === "no_guilt_treat" && !hadTreat) ||
    (best.choice === "go_easy_on_drinks" && !hadAlcohol);
  if (unsupported) {
    return { status: "quiet", message: null, reason: "The best-scoring message didn't match the logs." };
  }

  const message = MESSAGES[best.choice];
  return {
    status: "message",
    message: { id: best.choice, title: message.title, text: message.text },
    reason: `Jev picked "${best.choice}" with ${percent(best.probabilities[best.choice] ?? 0)} probability (confidence ${percent(best.confidence)}).`,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function runCoach(
  getClient: () => TypeSafeClient,
  request: CoachRequest,
): Promise<CoachResponse> {
  const facts = computeFacts(request);
  const { weightEntries, exerciseEntries, foodEntries } = request.today;

  if (weightEntries.length + exerciseEntries.length + foodEntries.length === 0) {
    return {
      status: "welcome",
      message: WELCOME_MESSAGE,
      reason: "Nothing logged today yet, so there's nothing for Jev to judge.",
      insights: [],
      facts,
      jev: { called: false, answers: [] },
    };
  }

  const started = performance.now();
  const response = await getClient().systemOne({
    state: buildState(request, facts),
    questions: buildQuestions(request),
  });
  const latencyMs = Math.round(performance.now() - started);
  const answers = response.answers as unknown as Record<string, Answer>;

  return {
    ...decide(request, answers),
    insights: buildInsights(answers),
    facts,
    jev: {
      called: true,
      model: response.model,
      latencyMs,
      inputTokens: response.usage.input_tokens,
      answers: summarize(answers),
    },
  };
}
