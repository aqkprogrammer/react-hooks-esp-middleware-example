import { useEffect, useId, useRef, useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useWebWorker } from '../../../hooks/advanced';
import { handlePrimesRequest, type PrimesRequest, type PrimesResponse } from './primes';
import './UseWebWorkerDemo.css';

type Result = Extract<PrimesResponse, { type: 'result' }> & { thread: 'worker' | 'main' };

/** Counts animation frames: it freezes whenever the main thread is blocked. */
function FrameCounter() {
  const outputRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frames = 0;
    let handle = requestAnimationFrame(function tick() {
      frames += 1;
      if (outputRef.current) outputRef.current.textContent = String(frames);
      handle = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(handle);
  }, []);
  return (
    <div className="row" aria-hidden="true">
      <span className="use-web-worker-spinner" />
      <span className="mono small">
        frames painted: <span ref={outputRef}>0</span>
      </span>
    </div>
  );
}

export default function UseWebWorkerDemo() {
  const limitId = useId();
  const [limit, setLimit] = useState(3_000_000);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const requestIdRef = useRef(0);

  const worker = useWebWorker<PrimesRequest, PrimesResponse>(
    // The literal `new Worker(new URL(...), …)` form is what lets Vite bundle the worker.
    () => new Worker(new URL('./primes.worker.ts', import.meta.url), { type: 'module' }),
    {
      onMessage: (message) => {
        if (message.id !== requestIdRef.current) return; // stale reply
        if (message.type === 'progress') setProgress(message.percent);
        else {
          setProgress(null);
          setResult({ ...message, thread: 'worker' });
        }
      },
    },
  );

  const runInWorker = () => {
    requestIdRef.current += 1;
    setProgress(0);
    if (!worker.postMessage({ id: requestIdRef.current, limit })) setProgress(null);
  };

  const runOnMainThread = () => {
    requestIdRef.current += 1;
    const id = requestIdRef.current;
    // Blocks the UI thread: the spinner and frame counter stop until it finishes.
    handlePrimesRequest({ id, limit }, (message) => {
      if (message.type === 'result') setResult({ ...message, thread: 'main' });
    });
  };

  const stop = () => {
    worker.terminate();
    requestIdRef.current += 1;
    setProgress(null);
  };

  return (
    <div className="stack">
      {worker.isSupported ? null : (
        <Callout tone="warn" title="Not supported in this browser">
          Web Workers are unavailable, so only the main-thread version can run.
        </Callout>
      )}
      <Panel
        title="Count primes"
        description="Run the same CPU-heavy loop in a worker and on the main thread, and watch the spinner."
      >
        <FrameCounter />
        <div className="row">
          <label htmlFor={limitId}>Upper limit</label>
          <select
            id={limitId}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            <option value={500_000}>500,000</option>
            <option value={3_000_000}>3,000,000</option>
            <option value={8_000_000}>8,000,000</option>
          </select>
        </div>
        <div className="row">
          <Button
            variant="primary"
            onClick={runInWorker}
            disabled={!worker.isSupported || progress !== null}
          >
            Count in a worker
          </Button>
          <Button onClick={runOnMainThread} disabled={progress !== null}>
            Count on the main thread (freezes UI)
          </Button>
          <Button variant="danger" onClick={stop} disabled={!worker.isRunning}>
            Terminate worker
          </Button>
        </div>
        {progress !== null ? (
          <label className="stack small">
            Worker progress: {progress}%
            <progress className="progress" max={100} value={progress} />
          </label>
        ) : null}
        <ValueTable
          label="Worker result"
          rows={{
            'Worker alive': (
              <Badge tone={worker.isRunning ? 'success' : 'neutral'}>
                {String(worker.isRunning)}
              </Badge>
            ),
            'Primes found': result ? result.count.toLocaleString() : '—',
            'Largest prime': result ? result.largest.toLocaleString() : '—',
            'Computed on': result ? `${result.thread} thread in ${result.ms} ms` : '—',
          }}
        />
        {worker.error ? (
          <Callout tone="danger" title="Worker error">
            {worker.error.message}
          </Callout>
        ) : null}
      </Panel>
    </div>
  );
}
