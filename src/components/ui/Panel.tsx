import { useId, type ReactNode } from 'react';

export interface PanelProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A titled, labelled region inside a demo. */
export function Panel({ title, description, children, className }: PanelProps) {
  const headingId = useId();
  return (
    <section className={['panel', className ?? ''].join(' ').trim()} aria-labelledby={headingId}>
      <h3 id={headingId} className="panel-title">
        {title}
      </h3>
      {description ? <div className="panel-description">{description}</div> : null}
      <div className="panel-body">{children}</div>
    </section>
  );
}
