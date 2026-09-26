import type { DailyState, HealthAnswers } from '../types/jev';

/**
 * Turns Jev's typed answers into what the output page shows: one verdict, at
 * most three directions, four tiles. This is where "directions, not stories"
 * lives. The day's state is optional and only adds concrete numbers.
 */

export type Tone = 'good' | 'okay' | 'bad' | 'neutral';

export type Direction = {
  text: string;
  /** Tiny supporting number, e.g. "4,200 / 9,000". */
  hint?: string;
  /** False when Jev wasn't confident; shown as "likely". */
  sure: boolean;
};

export type Tile = {
  key: string;
  label: string;
  value: string;
  detail?: string;
  tone: Tone;
  sure: boolean;
};

export type Briefing = {
  tone: Tone;
  word: string;
  headline: string;
  sure: boolean;
  directions: Direction[];
  tiles: Tile[];
  alerts: string[];
  progress?: { start: number; now: number; goal: number; pct: number; toGo: number };
  date?: string;
};

/** Below this, an answer is shown as a hedge ("likely") rather than a fact. */
const SURE = 0.5;
const nf = new Intl.NumberFormat('en-US');
const noulSure = (p: number) => Math.abs(p - 0.5) * 2 >= SURE;

const TONES: Record<string, { tone: Tone; word: string; headline: string }> = {
  celebratory: { tone: 'good', word: 'Crushing it.', headline: 'Keep doing exactly this.' },
  encouraging: { tone: 'good', word: 'On track.', headline: 'Good week. Small push today.' },
  corrective_gentle: { tone: 'okay', word: 'Drifting.', headline: 'Easy fixes below.' },
  corrective_direct: { tone: 'bad', word: 'Off track.', headline: 'Start with these today.' },
  neutral_informational: { tone: 'neutral', word: 'Early days.', headline: 'Log a few more days.' },
};

const NUTRIENT: Record<string, string> = {
  protein: 'Protein at every meal tomorrow',
  fiber: 'Add veggies to every meal tomorrow',
  reduce_sugar: 'Skip added sugar tomorrow',
  reduce_alcohol: 'No alcohol tomorrow',
};

function weightTile(a: HealthAnswers, day?: DailyState): Tile | undefined {
  const t = a.weight_trend;
  if (!t) return undefined;
  const map: Record<string, [string, Tone]> = {
    losing: ['Losing ↓', 'good'],
    plateaued: ['Flat →', 'okay'],
    gaining: ['Gaining ↑', 'bad'],
    insufficient_data: ['Unclear', 'neutral'],
  };
  const [value, tone] = map[t.choice] ?? [t.choice, 'neutral'];
  const entries = day?.weight?.last_7_entries_lbs;
  let detail: string | undefined;
  if (entries && entries.length >= 2) {
    const delta = entries[entries.length - 1] - entries[0];
    detail = `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta).toFixed(1)} lb this week`;
  }
  return { key: 'weight', label: 'Weight', value, detail, tone, sure: t.confidence >= SURE };
}

function foodTile(a: HealthAnswers): Tile | undefined {
  const s = a.day_alignment;
  if (!s) return undefined;
  const labels = ['Way over', 'Over', 'On target', 'Good', 'Ideal'];
  const level = Math.max(0, Math.min(4, Math.round(s.score)));
  const tone: Tone = level <= 1 ? 'bad' : level === 2 ? 'okay' : 'good';
  return { key: 'food', label: 'Food', value: labels[level], detail: `${s.score.toFixed(1)} / 4`, tone, sure: s.confidence >= SURE };
}

function exerciseTile(a: HealthAnswers, day?: DailyState): Tile | undefined {
  const s = a.exercise_intensity;
  if (!s) return undefined;
  const labels = ['None', 'Light', 'Moderate', 'Vigorous'];
  const level = Math.max(0, Math.min(3, Math.round(s.score)));
  const tone: Tone = level === 0 ? 'bad' : level === 1 ? 'okay' : 'good';
  const mins = day?.exercise_log_today?.reduce((sum, e) => sum + (e.duration_min ?? 0), 0);
  return {
    key: 'exercise',
    label: 'Exercise',
    value: labels[level],
    detail: mins ? `${mins} min` : undefined,
    tone,
    sure: s.confidence >= SURE,
  };
}

function stepsTile(a: HealthAnswers, day?: DailyState): Tile | undefined {
  const push = a.needs_step_push;
  const steps = day?.activity?.steps_so_far_today;
  const goal = day?.profile?.daily_step_goal;
  if (!push && steps == null) return undefined;
  const behind = push ? push.noul >= 0.5 : goal != null && steps! < goal;
  const pct = steps != null && goal ? steps / goal : undefined;
  const tone: Tone = !behind ? 'good' : pct != null && pct >= 0.5 ? 'okay' : 'bad';
  return {
    key: 'steps',
    label: 'Steps',
    value: steps != null ? nf.format(steps) : behind ? 'Behind' : 'On pace',
    detail: goal ? `of ${nf.format(goal)}` : undefined,
    tone,
    sure: push ? noulSure(push.noul) : true,
  };
}

export function buildBriefing(a: HealthAnswers, day?: DailyState): Briefing {
  const tiles = [weightTile(a, day), foodTile(a), exerciseTile(a, day), stepsTile(a, day)].filter(
    (t): t is Tile => !!t,
  );

  // Verdict: Jev's chosen tone, or a fallback from the tiles if that answer is missing.
  const toneAnswer = a.message_tone;
  let verdict = toneAnswer ? TONES[toneAnswer.choice] : undefined;
  if (!verdict) {
    const bad = tiles.filter((t) => t.tone === 'bad').length;
    verdict = tiles.length === 0 ? TONES.neutral_informational : bad >= 2 ? TONES.corrective_direct : bad === 1 ? TONES.corrective_gentle : TONES.encouraging;
  }

  // Directions, most urgent first, capped at three.
  const directions: Direction[] = [];
  const steps = day?.activity?.steps_so_far_today;
  const stepGoal = day?.profile?.daily_step_goal;

  if (a.needs_step_push && a.needs_step_push.noul >= 0.5) {
    const left = steps != null && stepGoal ? Math.max(0, stepGoal - steps) : undefined;
    directions.push({
      text: left ? `Walk ${nf.format(Math.ceil(left / 100) * 100)} more steps today` : 'Get your steps in today',
      hint: steps != null && stepGoal ? `${nf.format(steps)} / ${nf.format(stepGoal)}` : undefined,
      sure: noulSure(a.needs_step_push.noul),
    });
  }
  if (a.log_completeness && a.log_completeness.noul < 0.5) {
    directions.push({ text: 'Log the meal you missed', sure: noulSure(a.log_completeness.noul) });
  }
  if (a.day_alignment && a.day_alignment.score < 2) {
    directions.push({ text: 'Keep tomorrow’s meals lighter', hint: `food ${a.day_alignment.score.toFixed(1)} / 4`, sure: a.day_alignment.confidence >= SURE });
  }
  const nutrient = a.nutrient_focus && NUTRIENT[a.nutrient_focus.choice];
  if (nutrient) directions.push({ text: nutrient, sure: a.nutrient_focus!.confidence >= SURE });
  if (a.exercise_intensity && a.exercise_intensity.score < 0.5) {
    directions.push({ text: 'Move for 20 minutes tomorrow', sure: a.exercise_intensity.confidence >= SURE });
  }
  const sleep = day?.activity?.sleep_hours_last_night;
  if (sleep != null && sleep < 7) {
    directions.push({ text: 'In bed 30 minutes earlier tonight', hint: `${sleep} h last night`, sure: true });
  }
  if (directions.length === 0) directions.push({ text: 'Same again tomorrow', sure: true });

  const alerts: string[] = [];
  if (a.weigh_in_plausible && a.weigh_in_plausible.noul < 0.5) alerts.push('Today’s weigh-in looks off. Re-weigh tomorrow.');

  let progress: Briefing['progress'];
  const start = day?.profile?.starting_weight_lbs;
  const goal = day?.profile?.goal_weight_lbs;
  const now = day?.weight?.today_lbs;
  if (start != null && goal != null && now != null && start !== goal) {
    const pct = Math.max(0, Math.min(1, (start - now) / (start - goal)));
    progress = { start, now, goal, pct, toGo: Math.max(0, now - goal) };
  }

  return {
    ...verdict,
    sure: toneAnswer ? toneAnswer.confidence >= SURE : false,
    directions: directions.slice(0, 3),
    tiles,
    alerts,
    progress,
    date: day?.date,
  };
}
