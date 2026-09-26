# Review JSON Digestion Guide

This document explains how an analysis tool can digest the Review payload produced by this app.

## Goal

Turn daily review JSON into:

- reliable normalized metrics
- trend signals
- actionable feedback objects

Keep ingestion resilient when some fields are null.

## Expected Payload Shape

The app emits a payload with this high-level structure:

- user_id: string
- date: YYYY-MM-DD
- profile:
  - goal_weight_lbs: number
  - starting_weight_lbs: number
  - daily_step_goal: number
- weight:
  - today_lbs: number | null
  - yesterday_lbs: number | null
  - seven_day_avg_lbs: number | null
  - last_7_entries_lbs: number[]
- food_log_today: array of
  - time: HH:mm
  - entry: string
- exercise_log_today: array of
  - type: string | null
  - duration_min: number | null
  - entry: string
- activity:
  - steps_so_far_today: number | null
  - avg_steps_last_7_days: number | null
  - sleep_hours_last_night: number | null
- engagement:
  - current_logging_streak_days: number
  - days_since_last_weigh_in: number | null

## Ingestion Contract

Treat these as required for acceptance:

- user_id
- date
- profile
- weight
- food_log_today
- exercise_log_today
- activity
- engagement

Allow nullable values where documented. Do not reject payloads solely because a nullable metric is null.

## Parsing and Validation Steps

1. Parse JSON and validate top-level keys exist.
2. Validate scalar types.
3. Validate `date` format as YYYY-MM-DD.
4. Validate food times as HH:mm.
5. Coerce impossible values to null instead of throwing when safe:
   - negative duration_min
   - negative steps
   - non-finite numbers
6. Emit a validation report with:
   - errors: blocking issues
   - warnings: recoverable issues

## Normalization Rules

Use consistent defaults:

- Strings: trim whitespace.
- Numbers: round weights to 1 decimal place for display, keep raw precision for internal math when available.
- Arrays: sort logs by time ascending before meal timing analysis.
- Empty arrays: valid.

Recommended derived fields:

- weight_delta_day = today_lbs - yesterday_lbs (null if either missing)
- weight_goal_gap = today_lbs - profile.goal_weight_lbs (null if today missing)
- weigh_in_count_7d = length(last_7_entries_lbs)
- has_food_today = food_log_today.length > 0
- has_exercise_today = exercise_log_today.length > 0

## Heuristic Enrichment

If exercise type or duration is null, the tool can infer from `entry` text:

- type keywords:
  - run, jog -> run
  - walk, hike -> walk
  - bike, cycle -> bike
  - squat, deadlift, bench, lift -> strength
- duration patterns:
  - "25 min", "45 minutes" -> duration_min

Mark inferred values with metadata:

- source: "inferred" | "provided"
- confidence: 0.0 to 1.0

## Analysis Outputs

A practical output object can include:

- summary:
  - readiness_score (0-100)
  - adherence_score (0-100)
  - confidence_score (0-100)
- insights: string[]
- risks: string[]
- suggestions: string[]
- missing_data: string[]
- feature_flags:
  - used_inferred_exercise_type: boolean
  - used_inferred_duration: boolean

## Example Digestion Pipeline

1. Receive review payload.
2. Validate schema.
3. Normalize values.
4. Compute derived metrics.
5. Infer optional exercise fields.
6. Generate summary and recommendations.
7. Store both raw payload and normalized payload for traceability.

## Pseudocode

```ts
function digestReviewPayload(payload) {
  const report = validate(payload);
  if (report.errors.length > 0) return { ok: false, report };

  const normalized = normalize(payload);
  const derived = computeDerived(normalized);
  const enriched = inferExerciseFields(normalized);
  const analysis = scoreAndRecommend({
    ...normalized,
    ...derived,
    ...enriched,
  });

  return {
    ok: true,
    report,
    normalized,
    derived,
    analysis,
  };
}
```

## Practical Notes

- Preserve original payload unchanged for audit/debug.
- Version the parser logic (for example: digestor_version).
- Add unit tests for null-heavy payloads and malformed times.
- Prefer warning + fallback over hard failure for optional fields.
