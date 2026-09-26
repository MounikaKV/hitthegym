/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" builds only the pitch page (used on Vercel). */
  readonly VITE_PITCH_ONLY?: string;
  /** Where the full app runs when the pitch is hosted alone. Defaults to http://localhost:5173. */
  readonly VITE_LOCAL_APP_URL?: string;
}
