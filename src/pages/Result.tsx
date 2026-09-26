import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import '../styles/pitch.css';
import { BriefingCard } from '../components/BriefingCard';
import { InputLink } from '../components/InputLink';
import { JevAnswers } from '../components/JevAnswers';
import { SAMPLES } from '../data/samples';
import { decodePayload, encodePayload, loadSavedPayload, readStatePayload, resultPath, savePayload } from '../services/handoff';
import { buildBriefing } from '../utils/briefing';
import { parseJev } from '../utils/parseJev';

/**
 * The output page. Needs a Jev response; the day's state is optional.
 * See services/handoff.ts for the ways a result can arrive.
 */
function Result() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const encoded = params.get('d');

  const payload = useMemo(
    () => readStatePayload(location.state) ?? (encoded ? decodePayload(encoded) : null) ?? loadSavedPayload(),
    [location.state, encoded],
  );
  const answers = useMemo(() => (payload ? parseJev(payload.jev) : null), [payload]);
  const briefing = useMemo(() => (answers ? buildBriefing(answers, payload?.day) : null), [answers, payload]);

  // Keep the URL shareable and the result around for a refresh.
  useEffect(() => {
    if (!payload || !answers) return;
    savePayload(payload);
    if (!encoded) setParams({ d: encodePayload(payload) }, { replace: true, state: location.state });
  }, [payload, answers, encoded, setParams, location.state]);

  useEffect(() => {
    document.body.dataset.tone = briefing?.tone ?? '';
    return () => {
      delete document.body.dataset.tone;
    };
  }, [briefing]);

  if (!briefing || !answers) return <EmptyResult broken={!!payload} />;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'HitTheGym', text: `${briefing!.word} ${briefing!.headline}`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // Share sheet dismissed.
    }
  }

  return (
    <div className="htg result" data-tone={briefing.tone}>
      <nav className="nav">
        <Link to="/pitch" className="nav__logo">
          HitTheGym
        </Link>
        {briefing.date && <span className="result__date">{formatDate(briefing.date)}</span>}
      </nav>

      <main className="result__main">
        <BriefingCard key={encoded ?? briefing.word} briefing={briefing} />
        <JevAnswers answers={answers} />
      </main>

      <footer className="result__actions">
        <InputLink className="btn btn--solid-invert">Log another day</InputLink>
        <button type="button" className="btn btn--ghost-invert" onClick={share}>
          {copied ? 'Link copied' : 'Share'}
        </button>
      </footer>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function EmptyResult({ broken }: { broken: boolean }) {
  return (
    <div className="htg result result--empty">
      <nav className="nav">
        <Link to="/pitch" className="nav__logo">
          HitTheGym
        </Link>
      </nav>
      <main className="result__main">
        <h1 className="empty__title">{broken ? 'Couldn’t read that result.' : 'Nothing here yet.'}</h1>
        <p className="empty__sub">{broken ? 'Jev’s answers were missing or malformed.' : 'Log your day, or open a sample.'}</p>
        <InputLink className="btn btn--solid">Log your day →</InputLink>
        <div className="empty__samples">
          {SAMPLES.map((s) => (
            <Link key={s.name} to={resultPath(s)} className="chip">
              {s.name}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Result;
