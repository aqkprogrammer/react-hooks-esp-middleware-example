import { useEffect, useState } from 'react';
import { Button, Callout, Panel, TextField } from '../../../components/ui';

/**
 * A stale closure: an interval created once captures `count` and `step`
 * from the first render and never sees newer values.
 */
export default function UseEffectStaleClosureDemo() {
  return (
    <div className="stack">
      <div className="grid">
        <Panel
          title="Bug: missing dependencies"
          description={
            <>
              <code>setCount(count + step)</code> with deps <code>[running]</code>
            </>
          }
        >
          <StaleCounter />
        </Panel>
        <Panel
          title="Fix: updater + honest deps"
          description={
            <>
              <code>setCount(c =&gt; c + step)</code> with deps <code>[running, step]</code>
            </>
          }
        >
          <FreshCounter />
        </Panel>
      </div>
      <Callout title="Why the left counter sticks at one step">
        The interval callback was created during the render where <code>count</code> was 0, so it
        sets <code>0 + step</code> forever. Changing the step does nothing either: the callback
        still sees the first <code>step</code>. Never silence <code>exhaustive-deps</code> — remove
        the dependency instead (updater function) or list it.
      </Callout>
    </div>
  );
}

function StaleCounter() {
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setCount(count + step); // `count` and `step` are frozen at their values from this render
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberate bug: demonstrates the stale closure this rule prevents
  }, [running]);

  return (
    <CounterView
      prefix="Stale"
      count={count}
      step={step}
      running={running}
      onStepChange={setStep}
      onToggle={() => setRunning((value) => !value)}
      onReset={() => setCount(0)}
    />
  );
}

function FreshCounter() {
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!running) return;
    // The updater reads the latest count, so `count` is not a dependency.
    // `step` is, so changing it restarts the interval with the new value.
    const id = window.setInterval(() => setCount((c) => c + step), 1000);
    return () => window.clearInterval(id);
  }, [running, step]);

  return (
    <CounterView
      prefix="Fresh"
      count={count}
      step={step}
      running={running}
      onStepChange={setStep}
      onToggle={() => setRunning((value) => !value)}
      onReset={() => setCount(0)}
    />
  );
}

interface CounterViewProps {
  prefix: string;
  count: number;
  step: number;
  running: boolean;
  onStepChange: (step: number) => void;
  onToggle: () => void;
  onReset: () => void;
}

function CounterView({
  prefix,
  count,
  step,
  running,
  onStepChange,
  onToggle,
  onReset,
}: CounterViewProps) {
  return (
    <div className="stack">
      <output className="mono" aria-label={`${prefix} count`} style={{ fontSize: '1.5rem' }}>
        {count}
      </output>
      <TextField
        label={`${prefix} step`}
        type="number"
        min={1}
        max={100}
        value={step}
        onChange={(event) => onStepChange(Math.max(1, Number(event.target.value) || 1))}
      />
      <div className="row">
        <Button
          variant="primary"
          onClick={onToggle}
          aria-label={`${running ? 'Stop' : 'Start'} ${prefix.toLowerCase()} counter`}
        >
          {running ? 'Stop' : 'Start'}
        </Button>
        <Button onClick={onReset} aria-label={`Reset ${prefix.toLowerCase()} counter`}>
          Reset
        </Button>
      </div>
    </div>
  );
}
