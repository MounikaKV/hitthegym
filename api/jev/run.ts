import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildJevRequest } from '../../src/data/questions.js';

/**
 * Vercel function: POST /api/jev/run
 * Body: the day's state (the Review payload). Asks Jev the verdict questions and
 * returns { status: 'done', result: { jev, day } } for the result page.
 * Needs TYPESAFE_API_KEY in the Vercel project's environment variables.
 * (Locally, the same route is served by the dev-server plugin in vite.config.ts.)
 */

const MAX_BODY_BYTES = 64 * 1024;

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });

  const key = process.env.TYPESAFE_API_KEY;
  if (!key) return send(res, 500, { error: 'TYPESAFE_API_KEY is not set on the server.' });

  let day: unknown;
  try {
    day = await readJson(req);
    if (typeof day !== 'object' || day === null || Array.isArray(day)) throw new Error('Expected the day as a JSON object');
  } catch (err) {
    return send(res, 400, { error: err instanceof Error ? err.message : 'Invalid JSON' });
  }

  try {
    const upstream = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildJevRequest(day)),
      signal: AbortSignal.timeout(25_000),
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      console.error(`TypeSafe error ${upstream.status}: ${text.slice(0, 300)}`);
      return send(res, 502, { error: `Jev returned an error (${upstream.status}). Try again.` });
    }
    return send(res, 200, { status: 'done', result: { jev: JSON.parse(text), day } });
  } catch (err) {
    console.error(err);
    return send(res, 502, { error: 'Could not reach Jev. Try again.' });
  }
}
