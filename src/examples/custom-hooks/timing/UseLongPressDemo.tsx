import { useState } from 'react';
import { Badge, Button, EventLog, Panel, TextField, useEventLog } from '../../../components/ui';
import { useAnimationFrame, useLongPress } from '../../../hooks';
import './UseLongPressDemo.css';

/**
 * "Hold to delete": a destructive action guarded by a long press. Works with
 * mouse, touch, pen and the keyboard (hold Space or Enter).
 */
export default function UseLongPressDemo() {
  const [threshold, setThreshold] = useState(800);
  const [pressStart, setPressStart] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [deleted, setDeleted] = useState(false);
  const { entries, log, clear } = useEventLog();

  const handlers = useLongPress<HTMLButtonElement>(
    (event) => {
      setDeleted(true);
      setPressStart(null);
      log(`long press via ${event.type.startsWith('key') ? 'keyboard' : 'pointer'}`, 'success');
    },
    {
      threshold,
      onStart: () => {
        setPressStart(Date.now());
        setProgress(0);
        log('press started');
      },
      onCancel: () => {
        setPressStart(null);
        setProgress(0);
        log('released too early — cancelled', 'warn');
      },
      onFinish: () => log('released after the long press'),
    },
  );

  // Animate the progress bar only while a press is in progress.
  useAnimationFrame(
    () => {
      if (pressStart !== null) setProgress(Math.min(1, (Date.now() - pressStart) / threshold));
    },
    { paused: pressStart === null },
  );

  return (
    <div className="stack">
      <Panel title="Hold to delete" description="A short click only shows a hint.">
        {deleted ? (
          <div className="row">
            <Badge tone="warn">Draft deleted</Badge>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleted(false);
                setProgress(0);
              }}
            >
              Restore draft
            </Button>
          </div>
        ) : (
          <div className="stack">
            <Button
              variant="danger"
              className="use-long-press-target"
              aria-describedby="use-long-press-hint"
              {...handlers}
              onClick={() => log('click — hold the button to delete')}
            >
              Hold to delete draft
            </Button>
            <progress className="progress" aria-label="Hold progress" max={1} value={progress} />
            <p id="use-long-press-hint" className="small muted">
              Press and hold for {threshold} ms (mouse, touch or Space/Enter).
            </p>
          </div>
        )}
        <TextField
          label="Threshold (ms)"
          type="number"
          min={200}
          step={100}
          value={threshold}
          onChange={(event) => setThreshold(Math.max(200, Number(event.target.value) || 200))}
        />
        <EventLog entries={entries} onClear={clear} />
      </Panel>
    </div>
  );
}
