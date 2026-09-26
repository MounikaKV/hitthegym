import type { Briefing } from '../utils/briefing';

const ICON = { good: '✓', okay: '!', bad: '✕', neutral: '·' } as const;

type Props = {
  briefing: Briefing;
  /** `full` is the result page; `compact` is for previews on the landing page. */
  size?: 'full' | 'compact';
};

export function BriefingCard({ briefing: b, size = 'full' }: Props) {
  const compact = size === 'compact';
  const directions = compact ? b.directions.slice(0, 2) : b.directions;

  return (
    <article className={`brief brief--${size}`} data-tone={b.tone}>
      <header className="brief__top">
        <span className="brief__badge" aria-hidden="true">
          {ICON[b.tone]}
        </span>
        <h2 className="brief__word">{b.word}</h2>
      </header>
      <p className="brief__headline">{b.headline}</p>

      {b.progress && (
        <div className="progress">
          <div className="progress__track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(b.progress.pct * 100)} aria-label="Progress to goal weight">
            <div className="progress__fill" style={{ width: `${b.progress.pct * 100}%` }} />
          </div>
          <div className="progress__labels">
            <span>{b.progress.start}</span>
            <strong>
              {b.progress.now} lb · {b.progress.toGo.toFixed(1)} to go
            </strong>
            <span>{b.progress.goal}</span>
          </div>
        </div>
      )}

      {b.alerts.map((a) => (
        <p key={a} className="alert" role="alert">
          {a}
        </p>
      ))}

      <section className="brief__block">
        <h3 className="brief__label">Do this</h3>
        <ol className="dirs">
          {directions.map((d, i) => (
            <li key={d.text} className="dirs__item" style={{ animationDelay: `${250 + i * 110}ms` }}>
              <span className="dirs__arrow" aria-hidden="true">
                →
              </span>
              <span className="dirs__text">
                {d.text}
                {!d.sure && <span className="likely">likely</span>}
              </span>
              {!compact && d.hint && <span className="dirs__hint">{d.hint}</span>}
            </li>
          ))}
        </ol>
      </section>

      {b.tiles.length > 0 && (
        <ul className="tiles" aria-label="Today at a glance">
          {b.tiles.map((t) => (
            <li key={t.key} className={`tile${t.sure ? '' : ' tile--unsure'}`} data-tone={t.tone}>
              <span className="tile__label">{t.label}</span>
              <span className="tile__value">{t.value}</span>
              {!compact && t.detail && <span className="tile__detail">{t.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
