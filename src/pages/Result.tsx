import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/pitch.css';
import { BriefingCard } from '../components/BriefingCard';
import { InputLink } from '../components/InputLink';
import { JevAnswers } from '../components/JevAnswers';
import { SAMPLES } from '../data/samples';
import { fetchLatestJev, onJevUpdate, toPayload, type LocalJev } from '../services/localJev';
import {
  decodePayload,
  encodePayload,
  loadSavedPayload,
  readPendingRun,
  readStatePayload,
  resultPath,
  savePayload,
} from '../services/handoff';
import { PITCH_PATH } from '../config';
import { buildBriefing } from '../utils/briefing';
import { parseJev } from '../utils/parseJev';

/**
 * The output page. Needs a Jev response; the day's state is optional.
 *
 * Where the result comes from, in order:
 *   1. Passed in explicitly: router state or ?d= (see services/handoff.ts)
 *   2. The newest JSON in the local Jev output folder (dev server, live-updating).
 *      After "Get my verdict" on the Review page, only a run newer than the click
 *      counts, and the day's state is attached if the file doesn't include it.
 *   3. The last result shown in this tab
 */
function Result() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const encoded = params.get('d');

  const explicit = useMemo(
    () => readStatePayload(location.state) ?? (encoded ? decodePayload(encoded) : null),
    [location.state, encoded],
  );

  // Latest local Jev run, re-read whenever a file in the folder changes.
  const [local, setLocal] = useState<LocalJev | null>(null);
  const [localChecked, setLocalChecked] = useState(false);
  useEffect(() => {
    if (explicit) return;
    let alive = true;
    const load = () =>
      fetchLatestJev().then((latest) => {
        if (!alive) return;
        setLocal(latest);
        setLocalChecked(true);
      });
    load();
    const off = onJevUpdate(load);
    return () => {
      alive = false;
      off();
    };
  }, [explicit]);

  const pending = useMemo(() => readPendingRun(location.state), [location.state]);
  const localPayload = useMemo(() => {
    if (!local || (pending && local.modified < pending.since)) return null;
    const p = toPayload(local.data);
    return p.day || !pending ? p : { ...p, day: pending.day };
  }, [local, pending]);
  const payload = useMemo(
    () => explicit ?? localPayload ?? (localChecked && !pending ? loadSavedPayload() : null),
    [explicit, localPayload, localChecked, pending],
  );
  const answers = useMemo(() => (payload ? parseJev(payload.jev) : null), [payload]);
  const briefing = useMemo(() => (answers ? buildBriefing(answers, payload?.day) : null), [answers, payload]);
  const fromLocal = !explicit && !!local && payload === localPayload;

  // Remember the result for a refresh; make router-state results shareable by URL.
  useEffect(() => {
    if (!payload || !answers) return;
    savePayload(payload);
    if (explicit && !encoded) setParams({ d: encodePayload(payload) }, { replace: true, state: location.state });
  }, [payload, answers, explicit, encoded, setParams, location.state]);

  useEffect(() => {
    document.body.dataset.tone = briefing?.tone ?? '';
    return () => {
      delete document.body.dataset.tone;
    };
  }, [briefing]);

  if (!explicit && !localChecked) return <div className="htg result result--empty" aria-busy="true" />;
  if (pending && !localPayload) return <WaitingForJev />;
  if (!briefing || !answers) return <EmptyResult broken={!!payload} />;

  async function share() {
    const url = `${window.location.origin}${resultPath(payload!)}`;
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
        <Link to={PITCH_PATH} className="nav__logo">
          HitTheGym
        </Link>
        {briefing.date && <span className="result__date">{formatDate(briefing.date)}</span>}
      </nav>

      <main className="result__main">
        <BriefingCard key={fromLocal ? local!.modified : (encoded ?? briefing.word)} briefing={briefing} />
        <div className="result__meta">
          <JevAnswers answers={answers} />
          {fromLocal && (
            <p className="result__source" title={local!.modified}>
              {local!.seeded ? 'Sample run' : 'Latest Jev run'} · jev-output/{local!.file} · {timeAgo(local!.modified)}
            </p>
          )}
        </div>
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

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function WaitingForJev() {
  const navigate = useNavigate();
  return (
    <div className="htg result result--empty" aria-busy="true">
      <nav className="nav">
        <Link to={PITCH_PATH} className="nav__logo">
          HitTheGym
        </Link>
      </nav>
      <main className="result__main">
        <h1 className="empty__title waiting">Asking Jev…</h1>
        <p className="empty__sub">Your day is saved to jev-input/. This page updates as soon as a new run lands in jev-output/.</p>
        <button type="button" className="btn btn--outline" onClick={() => navigate('/result', { replace: true })}>
          Show the last result instead
        </button>
      </main>
    </div>
  );
}

function EmptyResult({ broken }: { broken: boolean }) {
  return (
    <div className="htg result result--empty">
      <nav className="nav">
        <Link to={PITCH_PATH} className="nav__logo">
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
