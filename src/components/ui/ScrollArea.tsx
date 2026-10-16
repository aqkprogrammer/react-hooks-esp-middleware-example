import type { ReactNode } from 'react';

export interface ScrollAreaProps {
  /** Accessible name of the scrollable region (required: it is a landmark). */
  label: string;
  children: ReactNode;
  /** CSS max-height of the region. Default `320px`. */
  maxHeight?: string;
  className?: string;
}

/**
 * A scrollable region that keyboard users can reach: it is focusable
 * (`tabIndex={0}`) and labelled, so arrow keys and Page Up/Down scroll it
 * even when it contains no interactive elements (WCAG 2.1.1; axe rule
 * `scrollable-region-focusable`). Lists inside it stop scrolling themselves.
 */
export function ScrollArea({ label, children, maxHeight = '320px', className }: ScrollAreaProps) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={['scroll-area', className ?? ''].join(' ').trim()}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
}
