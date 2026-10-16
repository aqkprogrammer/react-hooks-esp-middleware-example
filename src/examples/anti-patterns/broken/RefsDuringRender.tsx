/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Anti-pattern: reading and writing `ref.current` during render. Refs are not
 * reactive (changing them does not re-render), concurrent rendering may
 * render a component several times before committing, and the output no
 * longer depends only on props and state. `react-hooks/refs` reports these.
 * Corrected version: ../RefsInRenderDemo.tsx
 */
import { useRef, useState } from 'react';

export function ClickStats() {
  const [clicks, setClicks] = useState(0);
  const renders = useRef(0);
  const previousClicks = useRef(0);

  // ❌ Writing a ref during render: counts discarded/repeated renders too.
  renders.current += 1;
  // ❌ Reading a ref during render: shows a stale value because updating
  // the ref does not trigger a render.
  const delta = clicks - previousClicks.current;
  previousClicks.current = clicks;

  return (
    <div>
      <button onClick={() => setClicks((value) => value + 1)}>Click</button>
      <p>
        Renders: {renders.current}, last delta: {delta}
      </p>
    </div>
  );
}
