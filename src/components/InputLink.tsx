import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Where "Try it" goes: the in-app entry page, where people log their day. */
export const INPUT_PATH = '/entry';

export function InputLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link to={INPUT_PATH} className={className}>
      {children}
    </Link>
  );
}
