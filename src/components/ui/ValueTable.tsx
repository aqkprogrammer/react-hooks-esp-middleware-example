import type { ReactNode } from 'react';

export interface ValueTableProps {
  /** Label → value pairs. Values are rendered as-is; use `String()` for booleans. */
  rows: Record<string, ReactNode>;
  label?: string;
}

/** Read-only key/value readout for showing a hook's current return values. */
export function ValueTable({ rows, label }: ValueTableProps) {
  return (
    <dl className="value-table" aria-label={label}>
      {Object.entries(rows).map(([key, value]) => (
        <div key={key} className="value-row">
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
