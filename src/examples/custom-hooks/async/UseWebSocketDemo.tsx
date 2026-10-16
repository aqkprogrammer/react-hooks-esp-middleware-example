import { useState } from 'react';
import { Badge, Button, Callout, Panel, TextField, ValueTable } from '../../../components/ui';
import { useWebSocket } from '../../../hooks';
import { LIVE_SOCKET_URL } from '../../../mocks/handlers';

type ServerMessage =
  | { type: 'welcome'; at: number }
  | { type: 'pong'; at: number }
  | { type: 'notification'; id: string; text: string; at: number }
  | { type: 'error'; message: string };

const describe = (message: ServerMessage) => {
  switch (message.type) {
    case 'welcome':
      return 'Connected — server says welcome';
    case 'pong':
      return 'pong';
    case 'notification':
      return `Notification: ${message.text}`;
    case 'error':
      return `Server error: ${message.message}`;
  }
};

/** The mock server (MSW) echoes `ping` as `pong` and turns `notify` into a notification. */
export default function UseWebSocketDemo() {
  const [text, setText] = useState('Deploy finished');
  const [sendResult, setSendResult] = useState<string | null>(null);
  const socket = useWebSocket<ServerMessage>(LIVE_SOCKET_URL, {
    historyLimit: 20,
    reconnect: { maxAttempts: 5, baseDelayMs: 500 },
  });
  const open = socket.status === 'open';

  const report = (sent: boolean, what: string) =>
    setSendResult(sent ? `Sent ${what}` : `Not sent: the socket is ${socket.status}`);

  return (
    <div className="stack">
      <Panel title="Connection" description={<span className="mono small">{LIVE_SOCKET_URL}</span>}>
        <ValueTable
          label="Socket state"
          rows={{
            status: <Badge tone={open ? 'success' : 'warn'}>{socket.status}</Badge>,
            'reconnect attempt': socket.reconnectAttempt,
            'gave up': String(socket.gaveUp),
            'messages kept': `${socket.messages.length} / 20`,
          }}
        />
        <div className="row">
          <Button onClick={() => socket.close()} disabled={!open}>
            Close
          </Button>
          <Button onClick={socket.reconnect} disabled={socket.status === 'connecting'}>
            Reconnect
          </Button>
        </div>
      </Panel>
      <Panel title="Send">
        <div className="row">
          <Button onClick={() => report(socket.sendJson({ type: 'ping' }), 'ping')}>
            Send ping
          </Button>
          <TextField
            label="Notification text"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Button
            variant="primary"
            onClick={() => report(socket.sendJson({ type: 'notify', text }), 'notify')}
          >
            Send notify
          </Button>
          <Button onClick={() => report(socket.send('not json'), 'raw text')}>
            Send invalid message
          </Button>
        </div>
        {sendResult ? <p className="small muted">{sendResult}</p> : null}
      </Panel>
      <Panel title="Messages (newest last)">
        <div className="row">
          <Button size="sm" variant="ghost" onClick={socket.clearMessages}>
            Clear messages
          </Button>
        </div>
        <ol className="list" aria-label="Messages" aria-live="polite">
          {socket.messages.length === 0 ? <li className="muted">No messages yet.</li> : null}
          {socket.messages.map((message, index) => (
            <li key={index}>{describe(message)}</li>
          ))}
        </ol>
      </Panel>
      <Callout title="Reconnects">
        Closing on purpose never reconnects. An unexpected drop reconnects with exponential backoff
        and jitter, giving up after 5 consecutive failures.
      </Callout>
    </div>
  );
}
