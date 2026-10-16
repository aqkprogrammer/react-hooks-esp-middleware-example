import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Callout, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { createStarRating, type StarRatingWidget } from './starRatingWidget';
import './UseRefImperativeWidgetDemo.css';

type Log = (message: string, tone?: 'info' | 'success' | 'warn' | 'error') => void;

/**
 * Wrapping an imperative, non-React widget: a ref for the container, a ref
 * for the instance, an effect to create/destroy it and an effect to push
 * React state into it.
 */
export default function UseRefImperativeWidgetDemo() {
  const [rating, setRating] = useState(3);
  const [max, setMax] = useState(5);
  const [mounted, setMounted] = useState(true);
  const { entries, log, clear } = useEventLog(20);

  return (
    <div className="stack">
      <Panel
        title="React state ↔ widget"
        description="Click a star, or change the value from React."
      >
        {mounted ? (
          <StarRating value={rating} max={max} onChange={setRating} log={log} />
        ) : (
          <p className="muted">Widget destroyed.</p>
        )}
        <ValueTable label="React state" rows={{ rating, max }} />
        <div className="row">
          <Button onClick={() => setRating((value) => Math.max(0, value - 1))}>
            − 1 from React
          </Button>
          <Button onClick={() => setRating((value) => Math.min(max, value + 1))}>
            + 1 from React
          </Button>
          <Button
            onClick={() => {
              const nextMax = max === 5 ? 10 : 5;
              setMax(nextMax);
              setRating((value) => Math.min(value, nextMax));
            }}
          >
            Switch to {max === 5 ? 10 : 5} stars
          </Button>
          <Button variant="ghost" onClick={() => setMounted((value) => !value)}>
            {mounted ? 'Unmount widget' : 'Mount widget'}
          </Button>
        </div>
      </Panel>
      <EventLog entries={entries} onClear={clear} title="Widget lifecycle" />
      <Callout title="Who owns which DOM?">
        React renders an empty container and never touches its children; the widget owns everything
        inside it. Options that can only be set at creation (here <code>max</code>) recreate the
        instance; values with a setter (<code>value</code>) are synced by a separate effect.
      </Callout>
    </div>
  );
}

interface StarRatingProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  log: Log;
}

function StarRating({ value, max, onChange, log }: StarRatingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<StarRatingWidget | null>(null);

  // The widget keeps one callback for its lifetime; route it to the latest
  // `onChange` through a ref (updated after each commit, never during render).
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  // Create / destroy. Re-runs only for creation-time options.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const widget = createStarRating(container, {
      max,
      onChange: (next) => onChangeRef.current(next),
    });
    widgetRef.current = widget;
    log(`createStarRating({ max: ${max} })`, 'success');
    return () => {
      widget.destroy();
      widgetRef.current = null;
      log('widget.destroy()', 'warn');
    };
  }, [max, log]);

  // Sync React → widget. Declared after the create effect so it runs after it.
  useEffect(() => {
    widgetRef.current?.setValue(value);
  }, [value, max]);

  return <div ref={containerRef} className="use-ref-imperative-widget-demo-host" />;
}
