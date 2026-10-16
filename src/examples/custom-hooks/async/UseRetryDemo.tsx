import { useId, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  EventLog,
  Panel,
  ValueTable,
  useEventLog,
} from '../../../components/ui';
import { fetchJson, useRetry } from '../../../hooks';

interface FlakyResponse {
  message: string;
  attempt: number;
}

/**
 * `/api/flaky?key=…&failures=N` answers 503 for the first N calls per key,
 * then 200. Each run uses a fresh key so the server-side counter restarts.
 */
export default function UseRetryDemo() {
  const [failures, setFailures] = useState(2);
  const [maxAttempts, setMaxAttempts] = useState(4);
  const runKey = useRef(0);
  const { entries, log, clear } = useEventLog();
  const failuresId = useId();
  const attemptsId = useId();

  const request = useRetry(
    (signal, attempt) => {
      log(`Attempt ${attempt}: GET /api/flaky`);
      return fetchJson<FlakyResponse>(
        `/api/flaky?key=retry-demo-${runKey.current}&failures=${failures}`,
        { signal },
      );
    },
    {
      maxAttempts,
      baseDelayMs: 400,
      maxDelayMs: 4000,
      onRetry: ({ attempt, error, delayMs }) =>
        log(`Attempt ${attempt} failed (${error.message}); retrying in ${delayMs} ms`, 'warn'),
    },
  );

  const start = async () => {
    runKey.current += 1;
    log(`Run ${runKey.current}: server fails ${failures}×, client allows ${maxAttempts} attempts`);
    const outcome = await request.run();
    if (outcome.status === 'success') log(outcome.data.message, 'success');
    if (outcome.status === 'error') log(`Gave up: ${outcome.error.message}`, 'error');
    if (outcome.status === 'aborted') log('Cancelled', 'warn');
  };

  const busy = request.status === 'pending' || request.status === 'waiting';

  return (
    <div className="stack">
      <Panel
        title="Flaky endpoint"
        description="Exponential backoff (400 ms × 2ⁿ) with full jitter."
      >
        <div className="row">
          <div className="field">
            <label className="field-label" htmlFor={failuresId}>
              Server failures before success
            </label>
            <select
              id={failuresId}
              className="input"
              value={failures}
              onChange={(e) => setFailures(Number(e.target.value))}
              disabled={busy}
            >
              {[0, 1, 2, 3, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor={attemptsId}>
              Max attempts
            </label>
            <select
              id={attemptsId}
              className="input"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              disabled={busy}
            >
              {[1, 2, 3, 4, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row">
          <Button variant="primary" onClick={() => void start()} disabled={busy}>
            Run request
          </Button>
          <Button onClick={request.cancel} disabled={!busy}>
            Cancel
          </Button>
        </div>
        <ValueTable
          label="Retry state"
          rows={{
            status: (
              <Badge tone={request.status === 'error' ? 'warn' : 'info'}>{request.status}</Badge>
            ),
            attempt: request.attempt,
            'next retry in': request.status === 'waiting' ? `${request.nextRetryInMs} ms` : '—',
            'last error': request.error?.message ?? '—',
          }}
        />
      </Panel>
      <EventLog entries={entries} onClear={clear} title="Attempt log" />
      <Callout title="Only retry what is safe to repeat">
        Transient failures (network errors, timeouts, 408, 429, 5xx) are retried; a 400 or 401 would
        fail the same way again. Retry only idempotent requests.
      </Callout>
    </div>
  );
}
