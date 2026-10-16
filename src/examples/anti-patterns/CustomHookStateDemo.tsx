import { useState } from 'react';
import { Button, Callout, Panel } from '../../components/ui';

interface Stepper {
  value: number;
  increment: () => void;
  reset: () => void;
}

/**
 * A custom Hook is a function that calls Hooks. Each component that calls
 * it gets its *own* state — the Hook shares logic, not data.
 */
function useStepper(step: number): Stepper {
  const [value, setValue] = useState(0);
  return {
    value,
    increment: () => setValue((current) => current + step),
    reset: () => setValue(0),
  };
}

export default function CustomHookStateDemo() {
  // Lifting the Hook call into the parent is how two components share one state.
  const shared = useStepper(1);

  return (
    <div className="stack">
      <Panel
        title="Same Hook, independent state"
        description="Both cards call useStepper(). Clicking one does not affect the other."
      >
        <div className="grid">
          <ScoreCard label="Team A" step={1} />
          <ScoreCard label="Team B" step={3} />
        </div>
      </Panel>
      <Panel
        title="Shared state: call the Hook once and pass it down"
        description="Here the parent calls useStepper() and gives the result to both displays."
      >
        <div className="grid">
          <SharedDisplay label="Display 1" stepper={shared} />
          <SharedDisplay label="Display 2" stepper={shared} />
        </div>
      </Panel>
      <Callout title="Need state shared across distant components?">
        Lift it up, put it in context, or keep it in an external store read with{' '}
        <code>useSyncExternalStore</code> — calling the same custom Hook twice never shares state.
      </Callout>
    </div>
  );
}

function ScoreCard({ label, step }: { label: string; step: number }) {
  const { value, increment, reset } = useStepper(step);
  return (
    <section className="card stack" aria-label={label}>
      <strong>
        {label}: {value}
      </strong>
      <div className="row">
        <Button onClick={increment}>
          +{step} for {label}
        </Button>
        <Button variant="ghost" onClick={reset}>
          Reset {label}
        </Button>
      </div>
    </section>
  );
}

function SharedDisplay({ label, stepper }: { label: string; stepper: Stepper }) {
  return (
    <section className="card stack" aria-label={label}>
      <strong>
        {label}: {stepper.value}
      </strong>
      <Button onClick={stepper.increment}>+1 from {label}</Button>
    </section>
  );
}
