import { useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { fetchJson, usePolling } from '../../../hooks';

interface Stats {
  tick: number;
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
  updatedAt: string;
}

const fetchStats = (signal: AbortSignal) => fetchJson<Stats>('/api/stats', { signal });

export default function UsePollingDemo() {
  const [enabled, setEnabled] = useState(true);
  const [intervalMs, setIntervalMs] = useState(2000);
  const stats = usePolling(fetchStats, { intervalMs, enabled });

  const state = !enabled ? 'stopped' : stats.isPaused ? 'paused (tab hidden)' : 'polling';

  return (
    <div className="stack">
      <Panel title="Live dashboard" description="GET /api/stats every interval, never overlapping.">
        <p aria-live="polite">
          <Badge tone={state === 'polling' ? 'success' : 'warn'}>{state}</Badge>{' '}
          {stats.isFetching ? <Badge tone="info">fetching</Badge> : null}
        </p>
        <ValueTable
          label="Stats"
          rows={{
            'Poll #': stats.data?.tick ?? '—',
            'Active users': stats.data?.activeUsers ?? '—',
            'Requests / min': stats.data?.requestsPerMinute ?? '—',
            'Error rate': stats.data ? `${stats.data.errorRate}%` : '—',
            'Last update': stats.updatedAt
              ? new Date(stats.updatedAt).toLocaleTimeString(undefined, { hour12: false })
              : '—',
          }}
        />
        {stats.error ? (
          <Callout tone="danger" title="Last poll failed">
            {stats.error.message} — showing the previous values.
          </Callout>
        ) : null}
        <div className="row">
          <Button onClick={() => setEnabled((value) => !value)}>
            {enabled ? 'Stop polling' : 'Start polling'}
          </Button>
          <Button onClick={stats.refresh} disabled={!enabled}>
            Refresh now
          </Button>
          <Button
            onClick={() => setIntervalMs((ms) => (ms === 2000 ? 5000 : 2000))}
            aria-pressed={intervalMs === 5000}
          >
            Interval: {intervalMs / 1000} s
          </Button>
        </div>
      </Panel>
      <Callout title="How to test pausing">
        Note the poll number, switch to another browser tab (or minimise the window) for ~10
        seconds, then come back. The number has advanced by only one: nothing was requested while
        the page was hidden, and one poll ran immediately on return.
      </Callout>
    </div>
  );
}
