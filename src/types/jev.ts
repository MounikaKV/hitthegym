/**
 * Shapes for the Jev (TypeSafe System One) round trip.
 * API reference: https://docs.typesafe.ai/api.md
 */

/** The daily log the input page builds and sends to Jev as `state`. */
export type DailyState = {
  user_id?: string;
  date?: string;
  profile?: {
    goal_weight_lbs?: number | null;
    starting_weight_lbs?: number | null;
    daily_step_goal?: number | null;
  };
  weight?: {
    today_lbs?: number | null;
    yesterday_lbs?: number | null;
    seven_day_avg_lbs?: number | null;
    last_7_entries_lbs?: number[];
  };
  food_log_today?: { time?: string; entry: string }[];
  exercise_log_today?: { type?: string | null; duration_min?: number | null; entry?: string }[];
  activity?: {
    steps_so_far_today?: number | null;
    avg_steps_last_7_days?: number | null;
    sleep_hours_last_night?: number | null;
  };
  engagement?: {
    current_logging_streak_days?: number | null;
    days_since_last_weigh_in?: number | null;
  };
};

export type NoulAnswer = { type: 'noul'; noul: number };

export type ChoiceAnswer = {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

export type ScoreAnswer = {
  type: 'score';
  score: number;
  legend?: Record<string, string>;
  probabilities?: Record<string, number>;
  confidence: number;
};

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

/** Answers for the questions in `data/questions.ts`. Any of them may be missing. */
export type HealthAnswers = {
  weight_trend?: ChoiceAnswer;
  day_alignment?: ScoreAnswer;
  exercise_intensity?: ScoreAnswer;
  message_tone?: ChoiceAnswer;
  needs_step_push?: NoulAnswer;
  weigh_in_plausible?: NoulAnswer;
  log_completeness?: NoulAnswer;
  nutrient_focus?: ChoiceAnswer;
};

/** What the output page is handed: Jev's response, plus the day it was about (optional, adds numbers). */
export type ResultPayload = {
  jev: unknown;
  day?: DailyState;
};
