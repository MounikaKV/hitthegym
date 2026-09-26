import type { ResultPayload } from '../types/jev';

/** The newest Jev output file, as served by the dev server (see vite.config.ts). */
export type LocalJev = {
  file: string;
  modified: string;
  /** True when no run existed yet and the seed file was written. */
  seeded: boolean;
  data: unknown;
};

export async function fetchLatestJev(): Promise<LocalJev | null> {
  try {
    const res = await fetch('/api/jev/latest', { cache: 'no-store' });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    return typeof body === 'object' && body !== null && 'data' in body ? (body as LocalJev) : null;
  } catch {
    // No dev server API (e.g. a static deploy).
    return null;
  }
}

/** A file can be Jev's raw response, or `{ jev, day }` to include the day's state. */
export function toPayload(data: unknown): ResultPayload {
  if (typeof data === 'object' && data !== null && 'jev' in data) {
    const { jev, day } = data as ResultPayload;
    return { jev, day };
  }
  return { jev: data };
}

/** Calls `cb` whenever a JSON file in the Jev output folder changes (dev only). */
export function onJevUpdate(cb: () => void): () => void {
  const hot = import.meta.hot;
  if (!hot) return () => {};
  hot.on('jev:update', cb);
  return () => hot.off('jev:update', cb);
}
