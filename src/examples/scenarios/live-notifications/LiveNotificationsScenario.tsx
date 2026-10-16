import { useState, type FormEvent } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { useAnnouncer, useWebSocket, type ReconnectOptions } from '../../../hooks';
import { LIVE_SOCKET_URL } from '../../../mocks/handlers';
import { addNotification, parseServerMessage, type AppNotification } from './messages';
import './LiveNotificationsScenario.css';

const RECONNECT: ReconnectOptions = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  jitter: 'equal',
};
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 * A notification centre on a WebSocket: connection status with automatic
 * reconnects (exponential backoff), an unread count, mark-as-read and
 * screen-reader announcements for every new notification.
 */
export default function LiveNotificationsScenario() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [draft, setDraft] = useState('Build #42 passed');
  const [sendError, setSendError] = useState<string | null>(null);
  const [userClosed, setUserClosed] = useState(false);
  const { announce } = useAnnouncer();

  const socket = useWebSocket(LIVE_SOCKET_URL, {
    parse: parseServerMessage,
    // We keep our own (read/unread) list, so the hook's history can stay tiny.
    historyLimit: 1,
    reconnect: RECONNECT,
    onOpen: () => announce('Notifications connected.'),
    onClose: () => {
      if (!userClosed) announce('Notifications connection lost. Reconnecting…');
    },
    onMessage: (message) => {
      if (message?.type !== 'notification') return;
      setNotifications((list) => addNotification(list, message));
      announce(`New notification: ${message.text}`);
    },
  });

  const unread = notifications.filter((item) => !item.read).length;
  const { status, reconnectAttempt, gaveUp } = socket;
  const statusLabel =
    status === 'open'
      ? 'Connected'
      : status === 'connecting'
        ? reconnectAttempt > 0
          ? `Reconnecting (attempt ${reconnectAttempt} of ${RECONNECT.maxAttempts})…`
          : 'Connecting…'
        : status === 'closing'
          ? 'Disconnecting…'
          : gaveUp
            ? 'Disconnected — gave up reconnecting'
            : 'Disconnected';

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      setSendError('Enter a message.');
      return;
    }
    const sent = socket.sendJson({ type: 'notify', text });
    setSendError(sent ? null : 'Not connected — the message was not sent.');
  };

  const markRead = (id: string) =>
    setNotifications((list) =>
      list.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );

  return (
    <div className="stack">
      {!socket.isSupported ? (
        <Callout tone="warn" title="WebSocket unavailable">
          This environment has no WebSocket support, so live notifications are off.
        </Callout>
      ) : null}

      <Panel title="Connection">
        <div className="spread">
          <Badge tone={status === 'open' ? 'success' : 'warn'}>{statusLabel}</Badge>
          <div className="row">
            {status === 'open' || status === 'connecting' ? (
              <Button
                size="sm"
                onClick={() => {
                  setUserClosed(true);
                  socket.close(1000, 'User disconnected');
                  announce('Notifications disconnected.');
                }}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                disabled={status === 'closing'}
                onClick={() => {
                  setUserClosed(false);
                  socket.reconnect();
                }}
              >
                Reconnect
              </Button>
            )}
          </div>
        </div>
        <form className="live-notifications-form" onSubmit={send}>
          <TextField
            label="Notification text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            error={sendError}
            hint={
              <>
                Sends <code>{'{ type: "notify", text }'}</code>; the mock server pushes it back as a
                notification.
              </>
            }
          />
          <Button type="submit" variant="primary" disabled={status !== 'open'}>
            Send test notification
          </Button>
        </form>
      </Panel>

      <Panel title={`Notifications (${unread} unread)`}>
        <div className="row">
          <Button
            size="sm"
            disabled={unread === 0}
            onClick={() => {
              setNotifications((list) => list.map((item) => ({ ...item, read: true })));
              announce('All notifications marked as read.');
            }}
          >
            Mark all as read
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={notifications.length === 0}
            onClick={() => setNotifications([])}
          >
            Clear all
          </Button>
        </div>
        {notifications.length === 0 ? (
          <p className="muted">No notifications yet.</p>
        ) : (
          <ul className="list live-notifications-list" aria-label="Notifications">
            {notifications.map((item) => (
              <li
                key={item.id}
                className={[
                  'live-notifications-item',
                  item.read ? '' : 'live-notifications-unread',
                ].join(' ')}
              >
                <div className="live-notifications-body">
                  {item.read ? null : <Badge tone="info">New</Badge>}
                  <span>{item.text}</span>
                  <time className="muted small" dateTime={new Date(item.at).toISOString()}>
                    {timeFormat.format(item.at)}
                  </time>
                </div>
                {item.read ? null : (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Mark “${item.text}” as read`}
                    onClick={() => markRead(item.id)}
                  >
                    Mark as read
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
