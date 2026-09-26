import type { DailyState, ResultPayload } from '../types/jev';
import jevSeed from './jev-seed.json';

export type Sample = ResultPayload & { name: string; blurb: string; day: DailyState };

/**
 * Demo days for the landing page. The first is a real jev-1.13.0 run
 * (jev-seed.json). The other two are illustrative: hand-written answers in
 * Jev's response format.
 */
export const SAMPLES: Sample[] = [
  {
    name: 'Pizza night',
    blurb: 'Down 3 lb this week, pizza and a beer tonight',
    day: {
      user_id: 'user_482',
      date: '2026-09-26',
      profile: { goal_weight_lbs: 175, starting_weight_lbs: 205, daily_step_goal: 9000 },
      weight: {
        today_lbs: 187.4,
        yesterday_lbs: 187.9,
        seven_day_avg_lbs: 189.1,
        last_7_entries_lbs: [190.2, 189.8, 189.1, 188.6, 188, 187.9, 187.4],
      },
      food_log_today: [
        { time: '08:15', entry: 'black coffee and a banana' },
        { time: '12:40', entry: 'chicken burrito bowl, no rice, extra guac' },
        { time: '19:30', entry: 'two slices of pepperoni pizza and a beer' },
      ],
      exercise_log_today: [{ type: 'run', duration_min: 25, entry: 'easy 2.5 mile jog' }],
      activity: { steps_so_far_today: 4200, avg_steps_last_7_days: 6800, sleep_hours_last_night: 6.2 },
      engagement: { current_logging_streak_days: 5, days_since_last_weigh_in: 1 },
    },
    jev: jevSeed,
  },
  {
    name: 'Strong week',
    blurb: 'Clean meals, a hard lift, 11k steps',
    day: {
      user_id: 'user_207',
      date: '2026-09-26',
      profile: { goal_weight_lbs: 150, starting_weight_lbs: 172, daily_step_goal: 9000 },
      weight: { today_lbs: 158.6, yesterday_lbs: 158.9, last_7_entries_lbs: [161.0, 160.4, 160.1, 159.5, 159.2, 158.9, 158.6] },
      food_log_today: [
        { time: '07:30', entry: 'greek yogurt with berries and oats' },
        { time: '12:15', entry: 'grilled chicken salad with quinoa' },
        { time: '18:45', entry: 'salmon, roasted broccoli, sweet potato' },
      ],
      exercise_log_today: [{ type: 'strength', duration_min: 50, entry: 'heavy lower-body lift' }],
      activity: { steps_so_far_today: 11200, avg_steps_last_7_days: 9800, sleep_hours_last_night: 7.6 },
      engagement: { current_logging_streak_days: 21, days_since_last_weigh_in: 1 },
    },
    jev: {
      answers: {
        weight_trend: { type: 'choice', choice: 'losing', probabilities: { losing: 0.97, plateaued: 0.03 }, confidence: 0.96 },
        day_alignment: { type: 'score', score: 3.6, confidence: 0.81 },
        exercise_intensity: { type: 'score', score: 2.9, confidence: 0.9 },
        message_tone: { type: 'choice', choice: 'celebratory', probabilities: { celebratory: 0.84, encouraging: 0.16 }, confidence: 0.8 },
        needs_step_push: { type: 'noul', noul: 0.04 },
        weigh_in_plausible: { type: 'noul', noul: 0.97 },
        log_completeness: { type: 'noul', noul: 0.93 },
        nutrient_focus: { type: 'choice', choice: 'maintain', probabilities: { maintain: 0.74, protein: 0.2, fiber: 0.06 }, confidence: 0.67 },
      },
    },
  },
  {
    name: 'Rough patch',
    blurb: 'Weight creeping up, no workout, a skipped meal',
    day: {
      user_id: 'user_913',
      date: '2026-09-26',
      profile: { goal_weight_lbs: 180, starting_weight_lbs: 198, daily_step_goal: 9000 },
      weight: { today_lbs: 188.3, yesterday_lbs: 187.8, last_7_entries_lbs: [186.0, 186.4, 186.9, 187.3, 187.1, 187.8, 188.3] },
      food_log_today: [
        { time: '09:40', entry: 'two glazed donuts and a large latte' },
        { time: '20:10', entry: 'double burger, fries, three beers' },
      ],
      exercise_log_today: [],
      activity: { steps_so_far_today: 2100, avg_steps_last_7_days: 3900, sleep_hours_last_night: 5.1 },
      engagement: { current_logging_streak_days: 2, days_since_last_weigh_in: 1 },
    },
    jev: {
      answers: {
        weight_trend: { type: 'choice', choice: 'gaining', probabilities: { gaining: 0.91, plateaued: 0.09 }, confidence: 0.88 },
        day_alignment: { type: 'score', score: 0.3, confidence: 0.86 },
        exercise_intensity: { type: 'score', score: 0.02, confidence: 0.98 },
        message_tone: { type: 'choice', choice: 'corrective_direct', probabilities: { corrective_direct: 0.71, corrective_gentle: 0.29 }, confidence: 0.64 },
        needs_step_push: { type: 'noul', noul: 0.97 },
        weigh_in_plausible: { type: 'noul', noul: 0.93 },
        log_completeness: { type: 'noul', noul: 0.22 },
        nutrient_focus: { type: 'choice', choice: 'reduce_alcohol', probabilities: { reduce_alcohol: 0.62, reduce_sugar: 0.3, fiber: 0.08 }, confidence: 0.53 },
      },
    },
  },
];
