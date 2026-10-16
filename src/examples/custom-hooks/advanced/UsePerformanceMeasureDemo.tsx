import { useId, useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { usePerformanceMeasure } from '../../../hooks/advanced';

function busyWork(iterations: number): number {
  let total = 0;
  for (let index = 0; index < iterations; index += 1) total += Math.sqrt(index) % 7;
  return total;
}

export default function UsePerformanceMeasureDemo() {
  const delayId = useId();
  const [delay, setDelay] = useState(400);
  const [spanEnd, setSpanEnd] = useState<(() => void) | null>(null);
  const perf = usePerformanceMeasure({ namespace: 'playground' });

  if (!perf.isSupported) {
    return (
      <Callout tone="warn" title="Not supported in this browser">
        The User Timing API (<code>performance.mark</code>/<code>measure</code>) is unavailable.
      </Callout>
    );
  }

  return (
    <div className="stack">
      <Panel
        title="Measure work"
        description="Every span is also visible in the browser's Performance panel under the “playground:” prefix."
      >
        <div className="row">
          <label htmlFor={delayId}>Server latency</label>
          <select
            id={delayId}
            value={delay}
            onChange={(event) => setDelay(Number(event.target.value))}
          >
            {[100, 400, 1200].map((ms) => (
              <option key={ms} value={ms}>
                {ms} ms
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            onClick={() => {
              void perf
                .measure('fetch /api/slow', () =>
                  fetch(`/api/slow?ms=${delay}`).then((r) => r.json()),
                )
                .catch(() => {});
            }}
          >
            Measure a request
          </Button>
          <Button
            onClick={() => {
              void perf.measure('busy loop', () => busyWork(3_000_000));
            }}
          >
            Measure a CPU task
          </Button>
          <Button
            onClick={() => {
              void perf
                .measure('failing task', () => Promise.reject(new Error('boom')))
                .catch(() => {});
            }}
          >
            Measure a failure
          </Button>
        </div>
        <div className="row">
          <Button
            aria-pressed={spanEnd !== null}
            onClick={() => {
              if (spanEnd) {
                spanEnd();
                setSpanEnd(null);
              } else {
                const end = perf.start('manual span');
                setSpanEnd(() => end);
              }
            }}
          >
            {spanEnd ? 'Stop manual span' : 'Start manual span'}
          </Button>
          <Button variant="ghost" onClick={perf.clear} disabled={perf.measurements.length === 0}>
            Clear
          </Button>
          <Badge tone="info">
            {perf.usesObserver ? 'collected by PerformanceObserver' : 'read back directly'}
          </Badge>
        </div>
        <table className="small">
          <caption className="visually-hidden">Measurements, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Label</th>
              <th scope="col">Duration</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {perf.measurements.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  No measurements yet.
                </td>
              </tr>
            ) : (
              perf.measurements.map((entry) => (
                <tr key={`${entry.name}-${entry.startTime}`}>
                  <td>{entry.label}</td>
                  <td className="mono">{entry.duration.toFixed(1)} ms</td>
                  <td>
                    <Badge tone={entry.status === 'error' ? 'warn' : 'success'}>
                      {entry.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
      <Callout title="Timing renders?">
        Use React&apos;s <code>&lt;Profiler&gt;</code> or the React Performance tracks in DevTools —
        calling <code>performance.mark</code> in a component body is a side effect during render.
      </Callout>
    </div>
  );
}
