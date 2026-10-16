import { useEffect, useState } from 'react';
import { Button, Callout, Panel, TextField, ValueTable } from '../../../components/ui';

/**
 * Effects that synchronise with systems outside React: window event
 * listeners, timers and the document title. Each one undoes itself in its
 * cleanup.
 */
export default function UseEffectSubscriptionsDemo() {
  const [showTracker, setShowTracker] = useState(false);
  return (
    <div className="stack">
      <Panel
        title="Event listener: pointer position"
        description="window.addEventListener in an effect."
      >
        <Button onClick={() => setShowTracker((value) => !value)}>
          {showTracker ? 'Stop tracking' : 'Start tracking'}
        </Button>
        {showTracker ? (
          <PointerTracker />
        ) : (
          <p className="muted">Not tracking — no listener attached.</p>
        )}
      </Panel>
      <Panel
        title="Timer: stopwatch"
        description="setInterval while running, cleared in the cleanup."
      >
        <Stopwatch />
      </Panel>
      <Panel title="Browser API: document.title" description="The tab title follows the input.">
        <TitleSync />
      </Panel>
      <Callout title="Every setup needs a matching cleanup">
        <code>addEventListener</code> ↔ <code>removeEventListener</code>, <code>setInterval</code> ↔{' '}
        <code>clearInterval</code>, changing a global ↔ restoring it. If you can&apos;t write the
        cleanup, the effect probably doesn&apos;t belong in an effect.
      </Callout>
    </div>
  );
}

function PointerTracker() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) =>
      setPosition({ x: event.clientX, y: event.clientY });
    window.addEventListener('pointermove', onPointerMove);
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  return (
    <ValueTable
      label="Pointer"
      rows={{ position: position ? `${position.x}, ${position.y}` : 'move the pointer' }}
    />
  );
}

function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      // Updater form: the interval closure never needs a fresh `elapsedMs`.
      setElapsedMs((ms) => ms + 100);
    }, 100);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <div className="stack">
      <output className="mono" aria-label="Elapsed time" style={{ fontSize: '1.5rem' }}>
        {(elapsedMs / 1000).toFixed(1)} s
      </output>
      <div className="row">
        <Button variant="primary" onClick={() => setRunning((value) => !value)}>
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button
          onClick={() => {
            setRunning(false);
            setElapsedMs(0);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

function TitleSync() {
  const [title, setTitle] = useState('Hooks Playground');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const previous = document.title;
    document.title = title || 'Untitled';
    // Restore whatever was there before — on change and on unmount.
    return () => {
      document.title = previous;
    };
  }, [enabled, title]);

  return (
    <div className="stack">
      <label className="row">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Sync the tab title
      </label>
      <TextField
        label="Tab title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
    </div>
  );
}
