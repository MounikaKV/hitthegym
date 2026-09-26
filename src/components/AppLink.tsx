import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LOCAL_APP_URL, PITCH_ONLY } from '../config';

/** Link to an in-app route. On the pitch-only site, it points at the locally running app instead. */
export function AppLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return PITCH_ONLY ? (
    <a href={`${LOCAL_APP_URL}${to}`} className={className}>
      {children}
    </a>
  ) : (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
