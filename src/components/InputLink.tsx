import type { ReactNode } from 'react';
import { AppLink } from './AppLink';

/** Where "Try it" goes: the entry page, where people log their day. */
export function InputLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <AppLink to="/entry" className={className}>
      {children}
    </AppLink>
  );
}
