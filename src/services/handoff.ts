import type { DailyState, ResultPayload } from '../types/jev';

/**
 * How Jev's output gets to the result page. Three ways in, checked in order:
 *   1. Router state   navigate('/result', { state: { jev, day } })   same app
 *   2. URL param      /result?d=<base64url of { jev, day }>          any app, shareable
 *   3. Session cache  last result shown in this tab                  survives refresh
 */

const STORAGE_KEY = 'hitthegym:lastResult';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const isPayload = (v: unknown): v is ResultPayload => typeof v === 'object' && v !== null && 'jev' in v;

export function encodePayload(payload: ResultPayload): string {
  return toBase64Url(JSON.stringify({ jev: payload.jev, day: payload.day }));
}

export function decodePayload(encoded: string): ResultPayload | null {
  try {
    const data: unknown = JSON.parse(fromBase64Url(encoded));
    return isPayload(data) ? data : null;
  } catch {
    return null;
  }
}

/** `/result?d=...` for a payload. Prefix with the output site's origin when linking from another app. */
export function resultPath(payload: ResultPayload): string {
  return `/result?d=${encodePayload(payload)}`;
}

export function readStatePayload(state: unknown): ResultPayload | null {
  return isPayload(state) ? state : null;
}

export function savePayload(payload: ResultPayload): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage disabled: the URL param still works.
  }
}

export function loadSavedPayload(): ResultPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : null;
    return isPayload(data) ? data : null;
  } catch {
    return null;
  }
}

/** Set by the Review page's "Get my verdict": wait for a Jev run newer than `since`. */
export type PendingRun = { since: string; day: DailyState };

export function readPendingRun(state: unknown): PendingRun | null {
  const pending = (state as { pending?: PendingRun } | null)?.pending;
  return pending && typeof pending.since === 'string' ? pending : null;
}
