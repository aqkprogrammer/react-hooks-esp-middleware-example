import type { ReactNode } from 'react';

export interface BadgeProps {
  tone?: 'neutral' | 'beginner' | 'intermediate' | 'advanced' | 'info' | 'warn' | 'success';
  children: ReactNode;
  title?: string;
}

export function Badge({ tone = 'neutral', children, title }: BadgeProps) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {children}
    </span>
  );
}
