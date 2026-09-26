/**
 * Deploy modes.
 * - Full app (default, local): every route, pitch at /pitch.
 * - Pitch only (VITE_PITCH_ONLY=true, the Vercel build): just the pitch page at /,
 *   and its buttons point to the app running locally at VITE_LOCAL_APP_URL.
 */
export const PITCH_ONLY = import.meta.env.VITE_PITCH_ONLY === 'true';

export const LOCAL_APP_URL = (import.meta.env.VITE_LOCAL_APP_URL || 'http://localhost:5173').replace(/\/$/, '');

export const PITCH_PATH = PITCH_ONLY ? '/' : '/pitch';
