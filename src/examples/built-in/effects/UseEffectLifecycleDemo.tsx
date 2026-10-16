import { memo, useEffect, useState } from 'react';
import { Button, Callout, EventLog, Panel, useEventLog } from '../../../components/ui';

type Log = (message: string, tone?: 'info' | 'success' | 'warn' | 'error') => void;

const rooms = ['general', 'travel', 'music'] as const;

/**
 * Mount → update → unmount, logged. Three effects with different dependency
 * arrays show exactly when each one runs and when its cleanup runs.
 */
export default function UseEffectLifecycleDemo() {
  const [mounted, setMounted] = useState(true);
  const [roomId, setRoomId] = useState<string>('general');
  const { entries, log, clear } = useEventLog(40);

  return (
    <div className="stack">
      <Panel title="Controls">
        <div className="row">
          <Button variant="primary" onClick={() => setMounted((value) => !value)}>
            {mounted ? 'Unmount child' : 'Mount child'}
          </Button>
          <div className="row" role="group" aria-label="Room">
            {rooms.map((room) => (
              <Button
                key={room}
                size="sm"
                aria-pressed={roomId === room}
                variant={roomId === room ? 'primary' : 'secondary'}
                onClick={() => setRoomId(room)}
              >
                {room}
              </Button>
            ))}
          </div>
        </div>
        {mounted ? <Child roomId={roomId} log={log} /> : <p className="muted">Child unmounted.</p>}
      </Panel>
      <Panel title="Lifecycle log" description="Newest first.">
        <EventLog entries={entries} onClear={clear} title="Lifecycle" />
      </Panel>
      <Callout title="Reading the log">
        On mount every effect runs in declaration order. On an update React first runs the cleanup
        of each effect whose dependencies changed (with the <em>old</em> values), then the effects
        themselves. On unmount every cleanup runs. In development, Strict Mode adds one extra setup
        → cleanup cycle on mount — see the Strict Mode page.
      </Callout>
    </div>
  );
}

/**
 * memo() keeps the child from re-rendering when the parent re-renders only
 * because a log entry was added — otherwise the "no deps" effect would log on
 * every log entry, forever.
 */
const Child = memo(function Child({ roomId, log }: { roomId: string; log: Log }) {
  const [renders, setRenders] = useState(0);

  // No dependency array: runs after every commit of this component.
  useEffect(() => {
    log('[no deps] effect ran');
    return () => log('[no deps] cleanup', 'warn');
  });

  // Empty array: runs once after mount, cleans up on unmount.
  // (`log` is stable, so listing it does not cause re-runs.)
  useEffect(() => {
    log('[ [] ] mounted', 'success');
    return () => log('[ [] ] unmounted', 'warn');
  }, [log]);

  // [roomId]: re-runs only when roomId changes. The cleanup sees the old id.
  useEffect(() => {
    log(`[roomId] connect to "${roomId}"`, 'success');
    return () => log(`[roomId] disconnect from "${roomId}"`, 'warn');
  }, [roomId, log]);

  return (
    <div className="card stack">
      <p>
        Child connected to <strong>{roomId}</strong> · local renders: {renders}
      </p>
      <Button onClick={() => setRenders((count) => count + 1)}>Re-render the child</Button>
    </div>
  );
});
