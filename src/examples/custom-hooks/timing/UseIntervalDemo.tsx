import { useState } from 'react';
import { Badge, Button, Panel, TextField, ValueTable } from '../../../components/ui';
import { useInterval } from '../../../hooks';

/**
 * The interval reads the latest `step` without restarting, and a `null`
 * delay pauses it.
 */
export default function UseIntervalDemo() {
  const [running, setRunning] = useState(true);
  const [delay, setDelay] = useState(1000);
  const [step, setStep] = useState(1);
  const [count, setCount] = useState(0);
  const [ticks, setTicks] = useState(0);

  useInterval(
    () => {
      setCount((c) => c + step);
      setTicks((t) => t + 1);
    },
    running ? delay : null,
  );

  return (
    <div className="stack">
      <Panel title="Ticker">
        <div className="row">
          <TextField
            label="Delay (ms)"
            type="number"
            min={100}
            step={100}
            value={delay}
            onChange={(event) => setDelay(Math.max(100, Number(event.target.value) || 100))}
          />
          <TextField
            label="Step (read on each tick)"
            type="number"
            value={step}
            onChange={(event) => setStep(Number(event.target.value) || 0)}
          />
        </div>
        <div className="row">
          <Button variant="primary" aria-pressed={!running} onClick={() => setRunning((r) => !r)}>
            {running ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setCount(0);
              setTicks(0);
            }}
          >
            Reset
          </Button>
          <Badge tone={running ? 'success' : 'neutral'}>
            {running ? `running every ${delay} ms` : 'paused (delay = null)'}
          </Badge>
        </div>
        <ValueTable label="Ticker state" rows={{ Count: count, Ticks: ticks }} />
      </Panel>
    </div>
  );
}
