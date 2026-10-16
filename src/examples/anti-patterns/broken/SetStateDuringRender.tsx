/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Anti-pattern: calling setState unconditionally while rendering. Each call
 * schedules another render, which calls setState again: React aborts with
 * "Too many re-renders. React limits the number of renders to prevent an
 * infinite loop." `react-hooks/set-state-in-render` reports it.
 * Corrected version: ../SetStateInRenderDemo.tsx
 */
import { useState } from 'react';

export function Price({ amount, currency }: { amount: number; currency: string }) {
  const [formatted, setFormatted] = useState('');

  // ❌ Unconditional setState in render → infinite render loop.
  setFormatted(new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount));

  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div>
      <p>{formatted}</p>
      {/* ❌ Calls setSelected during render instead of passing a function. */}
      <button onClick={setSelected('buy')}>Buy</button>
      <p>{selected}</p>
    </div>
  );
}
