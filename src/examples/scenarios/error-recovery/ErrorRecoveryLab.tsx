import { useEffect, useId, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { fetchJson, useAsync, useExternalStore, useRetry } from '../../../hooks';
import { createErrorReporter, type ErrorReporter, type ReporterState } from './errorReporter';
import { ResettableErrorBoundary, type FallbackProps } from './ResettableErrorBoundary';

export interface ErrorRecoveryLabProps {
  /** First retry delay for the flaky request (exponential backoff, equal jitter). */
  retryBaseDelayMs?: number;
}

/** Everything that can go wrong in a component, and how each failure is recovered. */
export function ErrorRecoveryLab({ retryBaseDelayMs = 400 }: ErrorRecoveryLabProps) {
  const [reporter] = useState(() => createErrorReporter());
  return (
    <div className="stack">
      <div className="error-lab-grid">
        <RenderErrorDemo reporter={reporter} />
        <EventHandlerErrorDemo reporter={reporter} />
        <EffectErrorDemo reporter={reporter} />
        <RetryDemo reporter={reporter} baseDelayMs={retryBaseDelayMs} />
      </div>
      <ReporterPanel reporter={reporter} />
    </div>
  );
}

interface ReporterProps {
  reporter: ErrorReporter;
}

function Fallback({ error, resetErrorBoundary, extra }: FallbackProps & { extra?: ReactNode }) {
  return (
    <div role="alert" className="error-lab-fallback">
      <strong>Something went wrong.</strong>
      <p className="small mono">{error.message}</p>
      <div className="row">
        <Button size="sm" onClick={resetErrorBoundary}>
          Try again
        </Button>
        {extra}
      </div>
    </div>
  );
}

// ---- 1. Render errors: caught by the boundary -----------------------------------

interface Profile {
  name: string;
  email: string;
}

const GOOD_PROFILE: Profile = { name: 'Grace Hopper', email: 'grace@example.com' };

function ProfileCard({ profile }: { profile: Profile | null }) {
  // Simulates a component that trusts its data: malformed data throws during render.
  // (Real code should validate at the boundary of the system instead.)
  if (!profile) throw new TypeError("Cannot read properties of null (reading 'name')");
  return (
    <p className="error-lab-card">
      <strong>{profile.name}</strong> <span className="muted small">{profile.email}</span>
    </p>
  );
}

function RenderErrorDemo({ reporter }: ReporterProps) {
  const [malformed, setMalformed] = useState(false);
  const [catches, setCatches] = useState(0);
  const [account, setAccount] = useState('grace');
  const toggleId = useId();
  const accountId = useId();

  const onError = (error: Error, info: ErrorInfo) => {
    setCatches((count) => count + 1);
    reporter.report('render (boundary)', error, info.componentStack);
  };

  return (
    <Panel
      title="1. Render error → error boundary"
      description="A child throws while rendering; the boundary shows a fallback instead of unmounting the whole page."
    >
      <div className="row small">
        <input
          id={toggleId}
          type="checkbox"
          checked={malformed}
          onChange={(event) => setMalformed(event.target.checked)}
        />
        <label htmlFor={toggleId}>Server returns malformed profile data</label>
      </div>
      <div className="row small">
        <label htmlFor={accountId}>Account (a reset key)</label>
        <select id={accountId} value={account} onChange={(event) => setAccount(event.target.value)}>
          <option value="grace">grace</option>
          <option value="ada">ada</option>
        </select>
      </div>
      <ResettableErrorBoundary
        onError={onError}
        resetKeys={[account]}
        fallbackRender={(props) => (
          <Fallback
            {...props}
            extra={
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setMalformed(false);
                  props.resetErrorBoundary();
                }}
              >
                Fix data and retry
              </Button>
            }
          />
        )}
      >
        <ProfileCard profile={malformed ? null : GOOD_PROFILE} />
      </ResettableErrorBoundary>
      <p className="small muted">
        Errors caught: <Badge tone={catches ? 'warn' : 'neutral'}>{catches}</Badge> — “Try again”
        without fixing the cause just fails again; switching the account clears the error through{' '}
        <code>resetKeys</code>.
      </p>
    </Panel>
  );
}

// ---- 2. Event handler errors: NOT caught by boundaries --------------------------

function saveSettings(name: string): void {
  if (!name.trim()) throw new Error('Display name must not be empty');
}

function EventHandlerErrorDemo({ reporter }: ReporterProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [saved, setSaved] = useState(false);
  const nameId = useId();

  const onSave = () => {
    // A boundary would never see this throw: event handlers run outside rendering.
    try {
      saveSettings(name);
      setError(null);
      setSaved(true);
    } catch (caught) {
      const failure = caught instanceof Error ? caught : new Error(String(caught));
      setError(failure);
      setSaved(false);
      reporter.report('event handler', failure);
    }
  };

  return (
    <Panel
      title="2. Event handler error → state"
      description="Boundaries do not catch errors thrown in event handlers: catch them and put them in state."
    >
      <div className="field">
        <label htmlFor={nameId} className="field-label">
          Display name
        </label>
        <input
          id={nameId}
          className="input"
          value={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${nameId}-error` : undefined}
          onChange={(event) => setName(event.target.value)}
        />
        {error ? (
          <p id={`${nameId}-error`} className="field-error" role="alert">
            {error.message}
          </p>
        ) : null}
      </div>
      <div className="row">
        <Button onClick={onSave}>Save settings</Button>
        {saved ? <span className="small">Saved.</span> : null}
      </div>
    </Panel>
  );
}

// ---- 3. Async errors in effects -------------------------------------------------

interface Product {
  id: number;
  name: string;
}

function ProductName({
  productId,
  escalate,
  reporter,
}: { productId: number; escalate: boolean } & ReporterProps) {
  const product = useAsync(
    (signal) => fetchJson<Product>(`/api/products/${productId}`, { signal }),
    [productId],
  );
  const failure = product.status === 'error' ? product.error : null;

  // Handled inline: report once per failure (the ref dedupes Strict Mode's effect re-run).
  // Escalated errors are reported by the boundary instead.
  const reported = useRef<Error | null>(null);
  useEffect(() => {
    if (!failure || escalate || reported.current === failure) return;
    reported.current = failure;
    reporter.report('effect', failure);
  }, [failure, escalate, reporter]);

  if (failure && escalate) {
    // Escalate: rethrowing *during render* hands the async error to the nearest boundary.
    throw failure;
  }
  if (product.status === 'pending') return <p className="muted small">Loading product…</p>;
  if (failure) {
    return (
      <div className="stack">
        <p className="field-error" role="alert">
          Could not load product {productId}: {failure.message}
        </p>
        <div>
          <Button size="sm" onClick={product.reload}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
  return product.status === 'success' ? (
    <p className="error-lab-card">
      Product: <strong>{product.data.name}</strong>
    </p>
  ) : null;
}

function EffectErrorDemo({ reporter }: ReporterProps) {
  const [productId, setProductId] = useState(1);
  const [escalate, setEscalate] = useState(false);
  const productSelectId = useId();
  const escalateId = useId();
  return (
    <Panel
      title="3. Async error in an effect"
      description="A failed fetch inside an effect is not a render error: it arrives later, as state."
    >
      <div className="row small">
        <label htmlFor={productSelectId}>Product</label>
        <select
          id={productSelectId}
          value={productId}
          onChange={(event) => setProductId(Number(event.target.value))}
        >
          <option value={1}>#1 (exists)</option>
          <option value={999}>#999 (404)</option>
        </select>
      </div>
      <div className="row small">
        <input
          id={escalateId}
          type="checkbox"
          checked={escalate}
          onChange={(event) => setEscalate(event.target.checked)}
        />
        <label htmlFor={escalateId}>Escalate to the error boundary (rethrow during render)</label>
      </div>
      <ResettableErrorBoundary
        resetKeys={[productId, escalate]}
        onError={(error, info) => reporter.report('effect', error, info.componentStack)}
        fallbackRender={(props) => <Fallback {...props} />}
      >
        <ProductName productId={productId} escalate={escalate} reporter={reporter} />
      </ResettableErrorBoundary>
    </Panel>
  );
}

// ---- 4. Retrying a flaky request ------------------------------------------------

interface FlakyResponse {
  message: string;
  attempt: number;
}

// Module-level so keys stay unique across component instances (the mock counts failures per key).
let runSequence = 0;

function RetryDemo({ reporter, baseDelayMs }: ReporterProps & { baseDelayMs: number }) {
  const [failures, setFailures] = useState(2);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const runKey = useRef(0);
  const failuresId = useId();
  const attemptsId = useId();

  const request = useRetry(
    (signal) =>
      fetchJson<FlakyResponse>(
        `/api/flaky?key=error-recovery-${runKey.current}&failures=${failures}`,
        { signal },
      ),
    {
      maxAttempts,
      baseDelayMs,
      jitter: 'equal',
      onRetry: ({ error, attempt, delayMs }) =>
        reporter.report(
          'retry',
          new Error(`Attempt ${attempt} failed (${error.message}); retrying in ${delayMs} ms`),
        ),
    },
  );

  const run = () => {
    // A fresh key per run: the mock server counts failures per key.
    runSequence += 1;
    runKey.current = runSequence;
    void request.run();
  };

  return (
    <Panel
      title="4. Retry with backoff (useRetry)"
      description={
        <span>
          <code>GET /api/flaky</code> fails a set number of times with 503, then succeeds.
        </span>
      }
    >
      <div className="row small">
        <label htmlFor={failuresId}>Server failures before success</label>
        <select
          id={failuresId}
          value={failures}
          onChange={(event) => setFailures(Number(event.target.value))}
        >
          {[0, 1, 2, 3, 4].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <label htmlFor={attemptsId}>Max attempts</label>
        <select
          id={attemptsId}
          value={maxAttempts}
          onChange={(event) => setMaxAttempts(Number(event.target.value))}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="row">
        <Button
          variant="primary"
          onClick={run}
          disabled={request.status === 'pending' || request.status === 'waiting'}
        >
          Load report
        </Button>
        <Button
          onClick={request.cancel}
          disabled={request.status !== 'pending' && request.status !== 'waiting'}
        >
          Cancel
        </Button>
      </div>
      <ValueTable
        label="Retry state"
        rows={{
          status: request.status,
          attempt: request.attempt,
          'next retry in':
            request.nextRetryInMs === undefined ? '—' : `${request.nextRetryInMs} ms`,
          'last error': request.error?.message ?? '—',
          result: request.status === 'success' ? request.data.message : '—',
        }}
      />
      {request.status === 'error' ? (
        <p className="field-error" role="alert">
          Gave up after {request.attempt} attempt{request.attempt === 1 ? '' : 's'}.
        </p>
      ) : null}
    </Panel>
  );
}

// ---- Reporter -------------------------------------------------------------------

const selectReports = (state: ReporterState) => state.reports;

function ReporterPanel({ reporter }: ReporterProps) {
  const reports = useExternalStore(reporter.store, selectReports);
  return (
    <Panel
      title="Error reporter (mock)"
      description="What would be sent to your monitoring service. Nothing leaves the page."
    >
      {reports.length === 0 ? (
        <p className="muted">No errors reported.</p>
      ) : (
        <ol className="error-lab-reports" aria-label="Reported errors">
          {reports.map((report) => (
            <li key={report.id}>
              <Badge tone="warn">{report.source}</Badge>{' '}
              <span className="mono small">{report.message}</span>
              {report.componentStack ? (
                <span className="muted small"> — {report.componentStack}</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      <div>
        <Button size="sm" variant="ghost" onClick={reporter.clear} disabled={reports.length === 0}>
          Clear reports
        </Button>
      </div>
      <Callout title="Reporting errors globally (React 19)">
        <code>
          createRoot(container, {'{'} onCaughtError, onUncaughtError, onRecoverableError {'}'})
        </code>{' '}
        (also on <code>hydrateRoot</code>) receive every error React handles: caught by a boundary,
        uncaught (the root unmounts), or recovered automatically (e.g. hydration mismatches). Use
        them to send reports once for the whole app; boundaries still decide what the user sees.
      </Callout>
    </Panel>
  );
}
