import { useState } from 'react';
import { Badge, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useIdle, useInterval } from '../../../hooks';

const TIMEOUTS = [5000, 10000, 30000];

/**
 * Stop moving the pointer and typing: the status flips to idle when the
 * countdown reaches zero. Any activity — or returning to the tab — wakes it.
 */
export default function UseIdleDemo() {
  const [timeout, setTimeoutMs] = useState(5000);
  const { entries, log, clear } = useEventLog();
  const { isIdle, getLastActive } = useIdle(timeout, {
    onIdle: () => log('became idle', 'warn'),
    onActive: () => log('active again', 'success'),
  });

  // The last-activity time is not reactive (that would re-render on every
  // pointermove), so a cheap interval refreshes the countdown.
  const [remaining, setRemaining] = useState(timeout);
  useInterval(() => {
    const lastActive = getLastActive();
    setRemaining(lastActive ? Math.max(0, timeout - (Date.now() - lastActive)) : timeout);
  }, 250);

  return (
    <div className="stack">
      <Panel title="Idle detection">
        <label className="field">
          <span className="field-label">Idle after</span>
          <select
            className="input"
            value={timeout}
            onChange={(event) => setTimeoutMs(Number(event.target.value))}
          >
            {TIMEOUTS.map((ms) => (
              <option key={ms} value={ms}>
                {ms / 1000} seconds
              </option>
            ))}
          </select>
        </label>
        <ValueTable
          label="Idle state"
          rows={{
            Status: <Badge tone={isIdle ? 'warn' : 'success'}>{isIdle ? 'idle' : 'active'}</Badge>,
            'Idle in': isIdle ? '—' : `${Math.ceil(remaining / 1000)} s`,
          }}
        />
        <progress
          className="progress"
          aria-label="Time until idle"
          max={timeout}
          value={isIdle ? 0 : remaining}
        />
        <EventLog entries={entries} onClear={clear} />
      </Panel>
    </div>
  );
}
