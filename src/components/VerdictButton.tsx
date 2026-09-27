import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DailyState } from '../types/jev';

/**
 * Sends the day's state to POST /api/jev/run (the dev-server plugin in
 * vite.config.ts locally, api/jev/run.ts on Vercel). If Jev answered, opens the
 * result directly; otherwise the result page waits for a run in jev-output/.
 */
export function VerdictButton({ day }: { day: DailyState }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getVerdict() {
    setBusy(true);
    setError(null);
    const since = new Date().toISOString();
    try {
      const res = await fetch('/api/jev/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(day),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; result?: { jev: unknown; day?: DailyState } };
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      if (body.result) navigate('/result', { state: body.result });
      else navigate('/result', { state: { pending: { since, day } } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="action-btn" onClick={getVerdict} disabled={busy}>
        {busy ? 'Asking Jev…' : 'Get my verdict →'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
