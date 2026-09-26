import { useState } from 'react';
import type { Answer, HealthAnswers } from '../types/jev';

const pct = (p: number) => `${Math.round(p * 100)}%`;
const human = (s: string) => s.replace(/_/g, ' ');

function Bar({ value }: { value: number }) {
  return (
    <span className="bar">
      <span className="bar__fill" style={{ width: pct(Math.max(0, Math.min(1, value))) }} />
    </span>
  );
}

function Row({ id, answer }: { id: string; answer: Answer }) {
  if (answer.type === 'noul') {
    return (
      <li className="raw">
        <span className="raw__id">{human(id)}</span>
        <span className="raw__val">
          {answer.noul >= 0.5 ? 'yes' : 'no'} <small>{pct(answer.noul)} yes</small>
        </span>
        <Bar value={answer.noul} />
      </li>
    );
  }
  if (answer.type === 'score') {
    const max = answer.legend ? Object.keys(answer.legend).length - 1 : id === 'exercise_intensity' ? 3 : 4;
    return (
      <li className="raw">
        <span className="raw__id">{human(id)}</span>
        <span className="raw__val">
          {answer.score.toFixed(2)} <small>of {max} · {pct(answer.confidence)} conf.</small>
        </span>
        <Bar value={answer.score / max} />
      </li>
    );
  }
  const top = Object.entries(answer.probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return (
    <li className="raw">
      <span className="raw__id">{human(id)}</span>
      <span className="raw__val">
        {human(answer.choice)} <small>{pct(answer.confidence)} conf.</small>
      </span>
      <span className="raw__opts">
        {top.map(([opt, p]) => (
          <span key={opt}>
            {human(opt)} {pct(p)}
          </span>
        ))}
      </span>
    </li>
  );
}

/** The underlying Jev answers, collapsed by default. For the curious (and the judges). */
export function JevAnswers({ answers }: { answers: HealthAnswers }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(answers) as [string, Answer][];
  return (
    <section className="jev">
      <button type="button" className="jev__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide' : 'Show'} what Jev answered ({entries.length})
      </button>
      {open && (
        <ul className="jev__list">
          {entries.map(([id, a]) => (
            <Row key={id} id={id} answer={a} />
          ))}
        </ul>
      )}
    </section>
  );
}
