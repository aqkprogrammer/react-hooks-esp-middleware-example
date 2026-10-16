import { useState } from 'react';
import { Button, Panel, TextField, ValueTable } from '../../../components/ui';
import { useCounter } from '../../../hooks';

/** Empty or invalid input → `fallback`. */
const parse = (raw: string, fallback: number) => {
  const parsed = Number(raw);
  return raw.trim() === '' || Number.isNaN(parsed) ? fallback : parsed;
};

export default function UseCounterDemo() {
  // Inputs keep the raw text so that clearing a field and typing works.
  const [minText, setMinText] = useState('0');
  const [maxText, setMaxText] = useState('10');
  const [stepText, setStepText] = useState('1');
  const min = parse(minText, -Infinity);
  const max = parse(maxText, Infinity);
  const step = Math.max(1, parse(stepText, 1));
  const invalid = min > max;

  return (
    <div className="stack">
      <Panel
        title="Bounds"
        description="Narrow the bounds: the count is clamped immediately. Leave a bound empty for none."
      >
        <div className="row">
          <TextField
            label="min"
            type="number"
            value={minText}
            onChange={(event) => setMinText(event.target.value)}
          />
          <TextField
            label="max"
            type="number"
            value={maxText}
            onChange={(event) => setMaxText(event.target.value)}
            error={invalid ? 'max must be ≥ min' : undefined}
          />
          <TextField
            label="step"
            type="number"
            min={1}
            value={stepText}
            onChange={(event) => setStepText(event.target.value)}
          />
        </div>
      </Panel>
      {invalid ? null : <Stepper min={min} max={max} step={step} />}
    </div>
  );
}

function Stepper({ min, max, step }: { min: number; max: number; step: number }) {
  const counter = useCounter(1, { min, max, step });
  return (
    <Panel title="Quantity">
      <div className="row" role="group" aria-label="Quantity">
        <Button aria-label="Decrease" onClick={counter.decrement} disabled={counter.isAtMin}>
          −
        </Button>
        <output className="mono" aria-live="polite" aria-label="Quantity value">
          {counter.count}
        </output>
        <Button aria-label="Increase" onClick={counter.increment} disabled={counter.isAtMax}>
          +
        </Button>
      </div>
      <div className="row">
        <Button onClick={() => counter.set(100)}>Set to 100 (clamped)</Button>
        <Button onClick={() => counter.set((n) => n * 2)}>Double</Button>
        <Button variant="ghost" onClick={counter.reset}>
          Reset
        </Button>
      </div>
      <ValueTable
        label="Counter state"
        rows={{
          count: counter.count,
          isAtMin: String(counter.isAtMin),
          isAtMax: String(counter.isAtMax),
        }}
      />
    </Panel>
  );
}
