import { StrictMode, memo, useEffect, useState } from 'react';
import { Badge, Button, Callout, EventLog, Panel, useEventLog } from '../../../components/ui';

type Log = (message: string, tone?: 'info' | 'success' | 'warn' | 'error') => void;

/** A fake external system with an explicit connect/disconnect API. */
function createConnection(roomId: string, log: Log) {
  return {
    connect: () => log(`✅ connect("${roomId}")`, 'success'),
    disconnect: () => log(`❌ disconnect("${roomId}")`, 'warn'),
  };
}

/**
 * The same component mounted with and without <StrictMode>. In development,
 * Strict Mode mounts, unmounts and re-mounts every component once, so an
 * effect runs setup → cleanup → setup. A correct cleanup makes that harmless.
 */
export default function UseEffectStrictModeDemo() {
  const [mounted, setMounted] = useState(true);
  const strictLog = useEventLog(20);
  const plainLog = useEventLog(20);

  return (
    <div className="stack">
      <div className="row">
        <Button variant="primary" onClick={() => setMounted((value) => !value)}>
          {mounted ? 'Unmount both rooms' : 'Mount both rooms'}
        </Button>
        <Button
          onClick={() => {
            strictLog.clear();
            plainLog.clear();
          }}
        >
          Clear logs
        </Button>
        <Badge tone={import.meta.env.DEV ? 'info' : 'warn'}>
          {import.meta.env.DEV ? 'development build' : 'production build'}
        </Badge>
      </div>
      {import.meta.env.DEV ? null : (
        <Callout tone="warn" title="Production build">
          Strict Mode checks only run in development, so both logs look the same here. Run{' '}
          <code>npm run dev</code> to see the extra setup → cleanup cycle.
        </Callout>
      )}
      <div className="grid">
        <Panel title="Inside <StrictMode>">
          <StrictMode>
            {mounted ? <ChatRoom roomId="general" log={strictLog.log} /> : <Unmounted />}
          </StrictMode>
          <EventLog entries={strictLog.entries} title="Strict Mode log" />
        </Panel>
        <Panel title="Without Strict Mode">
          {mounted ? <ChatRoom roomId="general" log={plainLog.log} /> : <Unmounted />}
          <EventLog entries={plainLog.entries} title="Normal log" />
        </Panel>
      </div>
      <p className="muted small">
        Strict Mode cannot be switched off for a subtree: if the whole app is wrapped in{' '}
        <code>&lt;StrictMode&gt;</code>, both panels double-run. React also skips the extra cycle
        for a nested <code>&lt;StrictMode&gt;</code> during the very first render of a root, so
        unmount and mount the rooms to compare.
      </p>
      <Callout title="Don't fight it — fix the cleanup">
        If the double run causes a bug (two connections, two analytics events, a request without
        cancellation) the bug exists in production too: it shows up when users navigate away and
        back, or when React re-mounts a subtree. Do not guard effects with a{' '}
        <code>useRef(false)</code> &quot;did run&quot; flag; return a cleanup that undoes the setup.
      </Callout>
    </div>
  );
}

function Unmounted() {
  return <p className="muted">Unmounted.</p>;
}

const ChatRoom = memo(function ChatRoom({ roomId, log }: { roomId: string; log: Log }) {
  useEffect(() => {
    const connection = createConnection(roomId, log);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, log]);
  return (
    <p>
      Connected to <strong>{roomId}</strong>
    </p>
  );
});
