import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  EventLog,
  Panel,
  TextField,
  useEventLog,
} from '../../../components/ui';
import { LIVE_SOCKET_URL } from '../../../mocks/handlers';

type Status = 'connecting' | 'open' | 'closed';

interface ServerMessage {
  type: string;
  id?: string;
  text?: string;
  message?: string;
}

function parseMessage(data: unknown): ServerMessage | null {
  try {
    const parsed: unknown = JSON.parse(String(data));
    if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
      return parsed as ServerMessage;
    }
  } catch {
    // Not JSON — ignored below.
  }
  return null;
}

/**
 * An effect that owns a WebSocket: connect on mount (or when the channel
 * changes), close in the cleanup. The mocked server answers pings and echoes
 * notifications.
 */
export default function UseEffectWebSocketDemo() {
  const [enabled, setEnabled] = useState(true);
  const [channel, setChannel] = useState('general');
  const { entries, log, clear } = useEventLog(30);
  return (
    <div className="stack">
      <Panel title="Connection">
        <div className="row">
          <Button onClick={() => setEnabled((value) => !value)}>
            {enabled ? 'Unmount the client' : 'Mount the client'}
          </Button>
          <div className="row" role="group" aria-label="Channel">
            {['general', 'random'].map((name) => (
              <Button
                key={name}
                size="sm"
                aria-pressed={channel === name}
                variant={channel === name ? 'primary' : 'secondary'}
                onClick={() => setChannel(name)}
              >
                #{name}
              </Button>
            ))}
          </div>
        </div>
        {enabled ? (
          <SocketClient channel={channel} log={log} />
        ) : (
          <p className="muted">Client unmounted — the effect cleanup closed the socket.</p>
        )}
      </Panel>
      <Panel title="Socket events">
        <EventLog entries={entries} onClear={clear} title="Socket log" />
      </Panel>
      <Callout title="One effect, one connection">
        The effect depends on <code>channel</code>: switching channels runs the cleanup (closing the
        old socket) before connecting again. The socket lives in a ref so event handlers can send on
        it without re-running the effect.
      </Callout>
    </div>
  );
}

interface SocketClientProps {
  channel: string;
  log: (message: string, tone?: 'info' | 'success' | 'warn' | 'error') => void;
}

function SocketClient({ channel, log }: SocketClientProps) {
  const [status, setStatus] = useState<Status>('connecting');
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string }>>([]);
  const [text, setText] = useState('Hello from React');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(`${LIVE_SOCKET_URL}?channel=${encodeURIComponent(channel)}`);
    socketRef.current = socket;
    log(`connecting to #${channel}`);

    const onOpen = () => {
      setStatus('open');
      log(`open (#${channel})`, 'success');
    };
    const onMessage = (event: MessageEvent) => {
      const message = parseMessage(event.data);
      if (!message) return;
      log(`← ${message.type}`);
      if (message.type === 'notification' && message.text && message.id) {
        const received = { id: message.id, text: `#${channel}: ${message.text}` };
        setNotifications((previous) => [received, ...previous].slice(0, 5));
      }
    };
    const onClose = () => setStatus('closed');
    const onError = () => log('socket error', 'error');

    socket.addEventListener('open', onOpen);
    socket.addEventListener('message', onMessage);
    socket.addEventListener('close', onClose);
    socket.addEventListener('error', onError);

    return () => {
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('close', onClose);
      socket.removeEventListener('error', onError);
      socket.close();
      socketRef.current = null;
      setStatus('connecting');
      log(`cleanup: closed #${channel}`, 'warn');
    };
  }, [channel, log]);

  const send = (payload: object) => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
    log(`→ ${JSON.stringify(payload)}`);
  };

  return (
    <div className="stack">
      <p>
        Status:{' '}
        <Badge tone={status === 'open' ? 'success' : status === 'closed' ? 'warn' : 'neutral'}>
          {status}
        </Badge>
      </p>
      <div className="row">
        <Button onClick={() => send({ type: 'ping' })} disabled={status !== 'open'}>
          Send ping
        </Button>
      </div>
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          send({ type: 'notify', text });
        }}
      >
        <TextField
          label="Notification text"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={status !== 'open'}>
          Send notification
        </Button>
      </form>
      <ul className="list" aria-label="Notifications">
        {notifications.length === 0 ? <li className="muted">No notifications yet</li> : null}
        {notifications.map((notification) => (
          <li key={notification.id}>{notification.text}</li>
        ))}
      </ul>
    </div>
  );
}
