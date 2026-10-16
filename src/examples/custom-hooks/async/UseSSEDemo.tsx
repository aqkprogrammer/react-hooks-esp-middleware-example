import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useSSE } from '../../../hooks';

interface Tick {
  count: number;
  at: number;
}

/**
 * `/api/events` (MSW, browser only) sends five ticks then ends the stream —
 * after which the browser's EventSource reconnects on its own and the ticks
 * start again. Close the stream to stop it.
 */
export default function UseSSEDemo() {
  const feed = useSSE<Tick>('/api/events', { historyLimit: 10 });

  return (
    <div className="stack">
      <Panel title="Server-Sent Events">
        <ValueTable
          label="Stream state"
          rows={{
            supported: String(feed.isSupported),
            status: <Badge tone={feed.status === 'open' ? 'success' : 'warn'}>{feed.status}</Badge>,
            'last event id': feed.lastMessage?.lastEventId || '—',
            'last count': feed.lastMessage?.data.count ?? '—',
          }}
        />
        <div className="row">
          <Button onClick={feed.close} disabled={feed.status === 'closed'}>
            Close stream
          </Button>
          <Button onClick={feed.reconnect}>Reconnect</Button>
        </div>
      </Panel>
      <Panel title="Events (last 10)">
        <ol className="list" aria-label="Events" aria-live="polite">
          {feed.messages.length === 0 ? <li className="muted">Waiting for events…</li> : null}
          {feed.messages.map((message, index) => (
            <li key={`${message.lastEventId}-${index}`} className="spread">
              <span>Tick {message.data.count}</span>
              <span className="muted small mono">
                {new Date(message.data.at).toLocaleTimeString(undefined, { hour12: false })}
              </span>
            </li>
          ))}
        </ol>
      </Panel>
      {!feed.isSupported ? (
        <Callout tone="warn" title="EventSource is not available">
          This environment has no EventSource, so the stream cannot be opened.
        </Callout>
      ) : null}
      <Callout title="SSE vs WebSocket">
        SSE is one-way (server → client) over plain HTTP and reconnects automatically, resending the
        last event id. Use a WebSocket when the client must send messages too.
      </Callout>
    </div>
  );
}
