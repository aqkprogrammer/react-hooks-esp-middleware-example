import type { ReactNode } from 'react';

export interface CalloutProps {
  tone?: 'info' | 'success' | 'warn' | 'danger';
  title?: string;
  children: ReactNode;
}

/** Highlighted note. `danger`/`warn` use role="note" — they are not live alerts. */
export function Callout({ tone = 'info', title, children }: CalloutProps) {
  return (
    <div className={`callout callout-${tone}`} role="note">
      {title ? <strong className="callout-title">{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}
