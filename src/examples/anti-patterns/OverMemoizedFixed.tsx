import { useId, useState } from 'react';
import { Button, Callout, Panel } from '../../components/ui';

/**
 * Corrected version of broken/OverMemoized.tsx: the same counter with every
 * reflexive useMemo/useCallback removed. Behaviour is identical; the code is
 * shorter and has no dependency arrays to keep right.
 */
export default function OverMemoizedFixed() {
  const [step, setStep] = useState(1);
  const stepId = useId();
  return (
    <div className="stack">
      <Panel title="Counter (no memoisation needed)">
        <div className="row">
          <label htmlFor={stepId}>Step</label>
          <select
            id={stepId}
            value={step}
            onChange={(event) => setStep(Number(event.target.value))}
          >
            <option value={1}>1</option>
            <option value={5}>5</option>
          </select>
        </div>
        <Counter step={step} />
      </Panel>
      <Callout title="What was removed, and why it is fine">
        <ul>
          <li>
            <code>count * 2</code> and a template string — cheaper than the memo bookkeeping.
          </li>
          <li>
            <code>useCallback</code> on a handler passed to a DOM <code>&lt;button&gt;</code> — DOM
            elements never skip rendering based on prop identity.
          </li>
          <li>A constant style object — hoist it to module scope instead of memoising.</li>
        </ul>
        Add memoisation back only where profiling shows a slow calculation, or where identity
        matters (a <code>memo</code> child, an effect dependency).
      </Callout>
    </div>
  );
}

const labelStyle = { fontWeight: 600 } as const;

function Counter({ step }: { step: number }) {
  const [count, setCount] = useState(0);
  const doubled = count * 2;
  const label = `Count: ${count}`;
  return (
    <div className="stack">
      <p style={labelStyle}>
        {label} (doubled: {doubled})
      </p>
      <Button variant="primary" onClick={() => setCount((value) => value + step)}>
        +{step}
      </Button>
    </div>
  );
}
