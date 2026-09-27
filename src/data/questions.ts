/**
 * The questions sent to Jev with each day's state. The output page reads the
 * answers by these keys, so the input side should send exactly this map.
 */
export const QUESTIONS = {
  weight_trend: {
    type: 'choice',
    instructions: "Given the last 7 days of weight entries versus the goal, what is the user's current trend?",
    criteria: {
      losing: 'Weight is trending down toward the goal',
      plateaued: 'Weight has been flat for several days',
      gaining: 'Weight is trending up, away from the goal',
      insufficient_data: 'Not enough consistent entries to tell',
    },
  },
  day_alignment: {
    type: 'score',
    instructions: "How well does today's food log so far align with a weight-loss goal, from worst to best?",
    criteria: [
      'Significantly over goal calories or very low quality choices',
      'Somewhat over goal or low quality choices',
      'Roughly on target, mixed quality',
      'On target with good quality choices',
      'Ideal: on target calories and high quality choices',
    ],
  },
  exercise_intensity: {
    type: 'score',
    instructions: "Rate the intensity of today's logged exercise.",
    criteria: [
      'No exercise logged',
      'Light activity (short walk, stretching)',
      'Moderate activity (brisk walk, easy jog, light cycling)',
      'Vigorous activity (hard run, HIIT, heavy lifting)',
    ],
  },
  message_tone: {
    type: 'choice',
    instructions:
      "Given the weight trend, today's food log, and activity so far, which tone should tomorrow morning's coaching message use?",
    criteria: {
      celebratory: 'Recent progress has been strong and consistent',
      encouraging: 'Progress is fine but could use a gentle push',
      corrective_gentle: 'Recent choices have drifted from the goal; needs a soft course-correct',
      corrective_direct: 'A pattern of missed goals or gaming the log; needs a clear, direct nudge',
      neutral_informational: 'Not enough signal yet to take a stance; just report the numbers',
    },
  },
  needs_step_push: {
    type: 'noul',
    instructions: "Should today's message emphasize hitting the step goal more than usual?",
    criteria: {
      true: 'Steps so far are well behind pace for the daily goal, or the 7-day average is falling short',
      false: 'Steps are on pace or the 7-day average is close to the goal',
    },
  },
  weigh_in_plausible: {
    type: 'noul',
    instructions:
      "Is today's weight entry plausible given the recent history, or does it look like a likely data-entry error?",
    criteria: {
      true: 'The entry is consistent with the recent trend and a realistic day-to-day change',
      false: 'The entry is a large, physiologically implausible jump from recent history',
    },
  },
  log_completeness: {
    type: 'noul',
    instructions: "Does today's food log look complete for the time of day, or does it look like a meal is missing?",
    criteria: {
      true: 'The log looks complete for a typical day up to this point',
      false: 'A meal appears to be missing given the time of day and log gaps',
    },
  },
  nutrient_focus: {
    type: 'choice',
    instructions: "Based on today's food log, which nutrient focus should tomorrow's meal suggestions emphasize?",
    criteria: {
      protein: 'Recent meals are low in protein relative to goal',
      fiber: 'Recent meals are low in fiber or vegetables',
      reduce_sugar: 'Recent meals show a pattern of high added sugar',
      reduce_alcohol: 'Recent logs show a pattern of alcohol intake',
      maintain: 'Current balance is fine, no specific nutrient focus needed',
    },
  },
} as const;

export const JEV_MODEL = 'jev-latest';

/** Body for POST https://api.typesafe.ai/v1/systemone. Shared by the local dev bridge and the Vercel function. */
export function buildJevRequest(day: unknown) {
  return { state: day, model: JEV_MODEL, questions: QUESTIONS };
}
