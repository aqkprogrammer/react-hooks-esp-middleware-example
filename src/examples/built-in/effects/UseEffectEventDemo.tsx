import { memo, useEffect, useEffectEvent, useState } from 'react';
import { Button, Callout, EventLog, Panel, useEventLog } from '../../../components/ui';

type Theme = 'light' | 'dark';
type Log = (message: string, tone?: 'info' | 'success' | 'warn' | 'error') => void;

const rooms = ['general', 'travel', 'music'] as const;

/** A fake chat server: "connected" fires 500 ms after connect(). */
function createConnection(roomId: string) {
  let onConnected: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    roomId,
    on(_event: 'connected', handler: () => void) {
      onConnected = handler;
    },
    connect() {
      timer = setTimeout(() => onConnected?.(), 500);
    },
    disconnect() {
      clearTimeout(timer);
      onConnected = null;
    },
  };
}

/**
 * The connection must depend on `roomId` only. The "connected" notification
 * wants the current `theme`, but changing the theme must not reconnect —
 * so the notification is an Effect Event.
 */
export default function UseEffectEventDemo() {
  const [roomId, setRoomId] = useState<string>('general');
  const [theme, setTheme] = useState<Theme>('light');
  const naive = useEventLog(20);
  const fixed = useEventLog(20);

  return (
    <div className="stack">
      <Panel title="Controls">
        <div className="row" role="group" aria-label="Room">
          {rooms.map((room) => (
            <Button
              key={room}
              size="sm"
              aria-pressed={roomId === room}
              variant={roomId === room ? 'primary' : 'secondary'}
              onClick={() => setRoomId(room)}
            >
              #{room}
            </Button>
          ))}
        </div>
        <label className="row">
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
          />
          Dark notifications (theme = {theme})
        </label>
      </Panel>
      <div className="grid">
        <Panel title="theme in the dependencies" description="Toggling the theme reconnects.">
          <NaiveChatRoom roomId={roomId} theme={theme} log={naive.log} />
          <EventLog entries={naive.entries} onClear={naive.clear} title="Naive log" />
        </Panel>
        <Panel title="useEffectEvent" description="Only a room change reconnects.">
          <EffectEventChatRoom roomId={roomId} theme={theme} log={fixed.log} />
          <EventLog entries={fixed.entries} onClear={fixed.clear} title="Effect Event log" />
        </Panel>
      </div>
      <Callout title="Limitations of Effect Events">
        Call them only from inside effects (or from functions those effects start, like this timer
        callback). Never call one during render, never pass one to another component or hook, and
        never list one in a dependency array — the linter enforces this. Stable since React 19.2.
      </Callout>
    </div>
  );
}

interface ChatRoomProps {
  roomId: string;
  theme: Theme;
  log: Log;
}

const NaiveChatRoom = memo(function NaiveChatRoom({ roomId, theme, log }: ChatRoomProps) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => log(`🔔 Connected to #${roomId} (${theme} toast)`, 'success'));
    log(`connect #${roomId}`);
    connection.connect();
    return () => {
      connection.disconnect();
      log(`disconnect #${roomId}`, 'warn');
    };
    // `theme` is read inside, so it must be a dependency — and every theme
    // change tears the connection down.
  }, [roomId, theme, log]);
  return <p className="small">Room: #{roomId}</p>;
});

const EffectEventChatRoom = memo(function EffectEventChatRoom({
  roomId,
  theme,
  log,
}: ChatRoomProps) {
  // Not reactive: always sees the latest `theme` (and `log`) when it is called.
  const onConnected = useEffectEvent((connectedRoomId: string) => {
    log(`🔔 Connected to #${connectedRoomId} (${theme} toast)`, 'success');
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => onConnected(roomId));
    log(`connect #${roomId}`);
    connection.connect();
    return () => {
      connection.disconnect();
      log(`disconnect #${roomId}`, 'warn');
    };
  }, [roomId, log]); // onConnected is an Effect Event: never a dependency
  return <p className="small">Room: #{roomId}</p>;
});
