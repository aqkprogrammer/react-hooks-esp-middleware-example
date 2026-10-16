import { useId, useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { useOnlineStatus, usePageVisibility, usePolling, usePrevious } from '../../../hooks';
import { fetchStats, KPIS, type Kpi, type Stats } from './stats';
import './PollingDashboardScenario.css';

const INTERVALS = [2_000, 5_000, 10_000, 30_000] as const;
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

type PauseReason = 'offline' | 'hidden' | 'manual' | null;

/**
 * KPI cards fed by `usePolling`. Polling runs only while the tab is
 * visible (`usePageVisibility`), the device is online (`useOnlineStatus`)
 * and the user has not paused it; it resumes with an immediate request.
 */
export default function PollingDashboardScenario() {
  const intervalId = useId();
  const [intervalMs, setIntervalMs] = useState<number>(5_000);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const visible = usePageVisibility();
  const online = useOnlineStatus();

  const pauseReason: PauseReason = !online
    ? 'offline'
    : !visible
      ? 'hidden'
      : manuallyPaused
        ? 'manual'
        : null;

  const stats = usePolling(fetchStats, {
    intervalMs,
    enabled: pauseReason === null,
    // Visibility is already part of `enabled`, so the reason can be shown.
    pauseWhenHidden: false,
  });
  const previous = usePrevious(stats.data);

  const statusText =
    pauseReason === 'offline'
      ? 'Paused — you are offline'
      : pauseReason === 'hidden'
        ? 'Paused — tab hidden'
        : pauseReason === 'manual'
          ? 'Paused'
          : `Live — every ${intervalMs / 1000} s`;

  return (
    <div className="stack">
      <Panel title="Service health" description="Polls /api/stats; each response is one tick.">
        <div className="spread">
          <div className="row">
            <span role="status">
              <Badge tone={pauseReason === null ? 'success' : 'warn'}>{statusText}</Badge>
            </span>
            {stats.isFetching ? <Badge tone="info">updating…</Badge> : null}
          </div>
          <p className="small muted polling-dashboard-updated">
            {stats.updatedAt === undefined ? (
              'Waiting for the first update…'
            ) : (
              <>
                Last updated{' '}
                <time dateTime={new Date(stats.updatedAt).toISOString()}>
                  {timeFormat.format(stats.updatedAt)}
                </time>
                {stats.data ? ` · tick ${stats.data.tick}` : ''}
              </>
            )}
          </p>
        </div>

        {stats.error ? (
          <Callout tone="warn" title="Last update failed">
            {stats.error.message}.{' '}
            {stats.data
              ? 'Showing the last good data; the next poll will try again.'
              : 'The next poll will try again.'}
          </Callout>
        ) : null}

        <ul
          className="polling-dashboard-cards"
          aria-label="Key metrics"
          aria-busy={stats.isFetching}
        >
          {KPIS.map((kpi) => (
            <KpiCard key={kpi.key} kpi={kpi} current={stats.data} previous={previous} />
          ))}
        </ul>

        <div className="row polling-dashboard-controls">
          <div className="field">
            <label className="field-label" htmlFor={intervalId}>
              Refresh every
            </label>
            <select
              id={intervalId}
              value={intervalMs}
              onChange={(event) => setIntervalMs(Number(event.target.value))}
            >
              {INTERVALS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms / 1000} seconds
                </option>
              ))}
            </select>
          </div>
          <Button onClick={stats.refresh} disabled={pauseReason !== null}>
            Refresh now
          </Button>
          <Button
            variant={manuallyPaused ? 'primary' : 'secondary'}
            onClick={() => setManuallyPaused((value) => !value)}
            aria-pressed={manuallyPaused}
          >
            {manuallyPaused ? 'Resume' : 'Pause'}
          </Button>
        </div>
        {pauseReason === 'offline' ? (
          <p className="small muted">Polling resumes automatically when you are back online.</p>
        ) : null}
      </Panel>
    </div>
  );
}

function KpiCard({
  kpi,
  current,
  previous,
}: {
  kpi: Kpi;
  current: Stats | undefined;
  previous: Stats | undefined;
}) {
  const value = current?.[kpi.key];
  const before = previous?.[kpi.key];
  const delta = value !== undefined && before !== undefined ? value - before : undefined;
  let trend = '';
  let tone: 'good' | 'bad' | 'flat' = 'flat';
  if (delta !== undefined) {
    const rounded = Math.round(delta * 10) / 10;
    if (rounded === 0) trend = 'no change';
    else {
      trend = `${rounded > 0 ? 'up' : 'down'} ${kpi.format(Math.abs(rounded))}`;
      tone = rounded > 0 === kpi.higherIsBetter ? 'good' : 'bad';
    }
  }
  return (
    <li className="card polling-dashboard-card">
      <span className="polling-dashboard-label">{kpi.label}</span>
      <span className="polling-dashboard-value">
        {value === undefined ? '—' : kpi.format(value)}
      </span>
      <span className={`small polling-dashboard-trend polling-dashboard-trend-${tone}`}>
        {trend ? (
          <>
            <span aria-hidden="true">
              {tone === 'flat' ? '■' : trend.startsWith('up') ? '▲' : '▼'}{' '}
            </span>
            {trend} since last update
          </>
        ) : (
          ' '
        )}
      </span>
    </li>
  );
}
