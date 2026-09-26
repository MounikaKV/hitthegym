import type { Answer, ChoiceAnswer, HealthAnswers, NoulAnswer, ScoreAnswer } from '../types/jev';

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

function probs(v: unknown): Record<string, number> {
  if (!isObj(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([, p]) => typeof p === 'number')) as Record<string, number>;
}

function toAnswer(raw: unknown): Answer | undefined {
  if (!isObj(raw)) return undefined;
  if (raw.type === 'noul' || (raw.type === undefined && num(raw.noul) !== undefined)) {
    const noul = num(raw.noul);
    return noul === undefined ? undefined : ({ type: 'noul', noul } satisfies NoulAnswer);
  }
  if (raw.type === 'score' || (raw.type === undefined && num(raw.score) !== undefined)) {
    const score = num(raw.score);
    if (score === undefined) return undefined;
    return {
      type: 'score',
      score,
      legend: isObj(raw.legend) ? (raw.legend as Record<string, string>) : undefined,
      probabilities: probs(raw.probabilities),
      confidence: num(raw.confidence) ?? 1,
    } satisfies ScoreAnswer;
  }
  if (raw.type === 'choice' || (raw.type === undefined && typeof raw.choice === 'string')) {
    const probabilities = probs(raw.probabilities);
    const top = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]?.[0];
    const choice = typeof raw.choice === 'string' ? raw.choice : top;
    if (!choice) return undefined;
    return { type: 'choice', choice, probabilities, confidence: num(raw.confidence) ?? 1 } satisfies ChoiceAnswer;
  }
  return undefined;
}

const EXPECTED: Record<keyof HealthAnswers, Answer['type']> = {
  weight_trend: 'choice',
  day_alignment: 'score',
  exercise_intensity: 'score',
  message_tone: 'choice',
  needs_step_push: 'noul',
  weigh_in_plausible: 'noul',
  log_completeness: 'noul',
  nutrient_focus: 'choice',
};

/**
 * Reads a Jev response into typed answers. Accepts the full API response
 * (`{ model, answers, usage }`), the bare `answers` map, or either as a JSON
 * string. Unknown or malformed answers are dropped, never thrown on.
 */
export function parseJev(raw: unknown): HealthAnswers | null {
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!isObj(data)) return null;
  const answers = isObj(data.answers) ? data.answers : data;

  const out: HealthAnswers = {};
  for (const key of Object.keys(EXPECTED) as (keyof HealthAnswers)[]) {
    const a = toAnswer(answers[key]);
    if (a && a.type === EXPECTED[key]) (out as Record<string, Answer>)[key] = a;
  }
  return Object.keys(out).length ? out : null;
}
