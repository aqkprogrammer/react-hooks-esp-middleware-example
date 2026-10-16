import { useEffect, useEffectEvent, useId, useRef, useState, type FormEvent } from 'react';
import { Badge, Button, Callout, Panel, TextField, ValueTable } from '../../../components/ui';
import {
  useLatest,
  useNetworkInformation,
  useOnlineStatus,
  usePersistentState,
  webStorageAdapter,
} from '../../../hooks';
import {
  OUTBOX_KEY,
  createQueuedTodo,
  describeError,
  isNetworkFailure,
  isOutbox,
  postTodo,
  shouldKeep,
  type QueuedTodo,
  type SyncedTodo,
} from './outbox';

export interface ConnectivityLabProps {
  /** Forwarded as `?delay=` to the mock API. */
  requestDelayMs?: number;
}

const EMPTY: QueuedTodo[] = [];

/** Offline banner, a persisted outbox and replay on reconnection. */
export function ConnectivityLab({ requestDelayMs }: ConnectivityLabProps) {
  const browserOnline = useOnlineStatus();
  const network = useNetworkInformation();
  const [simulateOffline, setSimulateOffline] = useState(false);
  const online = browserOnline && !simulateOffline;

  const [outbox, setOutbox] = usePersistentState<QueuedTodo[]>(OUTBOX_KEY, EMPTY, {
    adapter: webStorageAdapter('local'),
    version: 1,
    validate: isOutbox,
  });
  const [failed, setFailed] = useState<readonly QueuedTodo[]>([]);
  const [synced, setSynced] = useState<readonly SyncedTodo[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [title, setTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const simulateId = useId();

  const onlineRef = useLatest(online);
  const outboxRef = useLatest(outbox);
  const replaying = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  // One controller for the component's lifetime: unmounting aborts any request.
  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    return () => controller.abort();
  }, []);

  /** Sends queued actions oldest first; stops when the connection drops again. */
  const replay = async () => {
    const signal = controllerRef.current?.signal;
    if (replaying.current || !signal || signal.aborted) return;
    replaying.current = true;
    setSyncing(true);
    const attempted = new Set<string>();
    try {
      while (onlineRef.current && !signal.aborted) {
        // The ref holds the latest committed queue, including items added meanwhile.
        const next = outboxRef.current.find((item) => !attempted.has(item.id));
        if (!next) break;
        attempted.add(next.id);
        try {
          const saved = await postTodo(next, signal, requestDelayMs);
          setOutbox((current) => current.filter((item) => item.id !== next.id));
          setSynced((current) => [saved, ...current]);
        } catch (error) {
          if (signal.aborted) return;
          const attempts = next.attempts + 1;
          const updated = { ...next, attempts, lastError: describeError(error) };
          if (shouldKeep(error, attempts)) {
            setOutbox((current) => current.map((item) => (item.id === next.id ? updated : item)));
          } else {
            setOutbox((current) => current.filter((item) => item.id !== next.id));
            setFailed((current) => [...current, updated]);
          }
          // No connection after all: keep everything else for the next reconnect.
          if (isNetworkFailure(error)) break;
        }
      }
    } finally {
      replaying.current = false;
      if (!signal.aborted) setSyncing(false);
    }
  };

  // Replay whenever we (re)gain a connection — including on mount, for a
  // queue persisted by an earlier visit.
  const onConnected = useEffectEvent(() => {
    if (outbox.length > 0) void replay();
  });
  useEffect(() => {
    if (online) onConnected();
  }, [online]);

  const enqueue = (item: QueuedTodo) => setOutbox((current) => [...current, item]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = title.trim();
    if (!text) {
      setFormError('Enter a title.');
      return;
    }
    setFormError(null);
    setTitle('');
    const item = createQueuedTodo(text);
    // Offline — or older actions still waiting — goes through the outbox, so order is kept.
    if (!online || outbox.length > 0) {
      enqueue(item);
      if (online) void replay();
      return;
    }
    const signal = controllerRef.current?.signal;
    if (!signal) return;
    try {
      const saved = await postTodo(item, signal, requestDelayMs);
      setSynced((current) => [saved, ...current]);
    } catch (error) {
      if (signal.aborted) return;
      if (isNetworkFailure(error)) enqueue(item);
      else setFormError(`Server rejected “${text}”: ${describeError(error)}`);
    }
  };

  const banner = !online
    ? {
        tone: 'offline',
        text: simulateOffline
          ? 'You are offline (simulated). New todos are saved on this device and sync when you are back online.'
          : 'You are offline. New todos are saved on this device and sync when you are back online.',
      }
    : syncing
      ? { tone: 'syncing', text: `Back online — syncing ${outbox.length} change(s)…` }
      : outbox.length > 0
        ? { tone: 'pending', text: `${outbox.length} change(s) waiting to sync.` }
        : null;

  return (
    <div className="stack">
      <div role="status" className={`connectivity-banner connectivity-${banner?.tone ?? 'online'}`}>
        {banner ? banner.text : synced.length > 0 ? 'All changes synced.' : 'Online.'}
      </div>

      <Panel title="Connection">
        <div className="row small">
          <input
            id={simulateId}
            type="checkbox"
            role="switch"
            checked={simulateOffline}
            onChange={(event) => setSimulateOffline(event.target.checked)}
          />
          <label htmlFor={simulateId}>Simulate offline (this app only)</label>
        </div>
        <p className="small muted">
          JavaScript cannot disconnect the browser. The switch makes <em>this app</em> behave as if
          offline — it stops sending requests and queues them. For a real outage use your
          browser&apos;s DevTools (Network → Offline), which fires the <code>offline</code> event
          that <code>useOnlineStatus</code> listens to.
        </p>
        <ValueTable
          label="Connection details"
          rows={{
            'navigator.onLine (useOnlineStatus)': String(browserOnline),
            'Simulated offline': String(simulateOffline),
            'App treats itself as': online ? 'online' : 'offline',
            'Network Information API': network.isSupported
              ? `${network.effectiveType ?? '?'} · ${network.downlink ?? '?'} Mb/s · ${network.rtt ?? '?'} ms RTT${network.saveData ? ' · data saver on' : ''}`
              : 'not supported in this browser (Chromium only)',
          }}
        />
        {network.isSupported &&
        (network.saveData ||
          network.effectiveType === '2g' ||
          network.effectiveType === 'slow-2g') ? (
          <Callout tone="info" title="Slow or metered connection">
            A real app would defer large downloads (images, video) here.
          </Callout>
        ) : null}
      </Panel>

      <Panel
        title="Add a todo"
        description="Saved to the mock API, or to the outbox while offline."
      >
        <form className="row connectivity-form" onSubmit={(event) => void onSubmit(event)}>
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={formError ?? undefined}
            hint={'A title containing “fail” is rejected by the server (500).'}
          />
          <Button type="submit" variant="primary">
            Add todo
          </Button>
        </form>
      </Panel>

      <div className="connectivity-grid">
        <Panel title="Outbox" description="Persisted in localStorage — survives a reload.">
          {outbox.length === 0 ? (
            <p className="muted small">Empty.</p>
          ) : (
            <ol className="connectivity-list" aria-label="Outbox">
              {outbox.map((item) => (
                <li key={item.id} className="spread">
                  <span>
                    {item.title}{' '}
                    {item.attempts > 0 ? (
                      <span className="small muted">
                        (attempt {item.attempts} failed: {item.lastError})
                      </span>
                    ) : null}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setOutbox((current) => current.filter((entry) => entry.id !== item.id))
                    }
                  >
                    Discard <span className="visually-hidden">{item.title}</span>
                  </Button>
                </li>
              ))}
            </ol>
          )}
          <div>
            <Button
              size="sm"
              onClick={() => void replay()}
              disabled={!online || syncing || outbox.length === 0}
            >
              Sync now
            </Button>
          </div>
        </Panel>

        <Panel title="Needs attention" description="Gave up after repeated failures.">
          {failed.length === 0 ? (
            <p className="muted small">Nothing failed.</p>
          ) : (
            <ul className="connectivity-list" aria-label="Failed changes">
              {failed.map((item) => (
                <li key={item.id} className="spread">
                  <span>
                    {item.title} <span className="small muted">— {item.lastError}</span>
                  </span>
                  <span className="row">
                    <Button
                      size="sm"
                      onClick={() => {
                        setFailed((current) => current.filter((entry) => entry.id !== item.id));
                        enqueue({ ...item, attempts: 0 });
                      }}
                    >
                      Requeue <span className="visually-hidden">{item.title}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setFailed((current) => current.filter((entry) => entry.id !== item.id))
                      }
                    >
                      Discard <span className="visually-hidden">{item.title}</span>
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Synced" description="Confirmed by the server.">
          {synced.length === 0 ? (
            <p className="muted small">Nothing yet.</p>
          ) : (
            <ul className="connectivity-list" aria-label="Synced todos">
              {synced.map((todo) => (
                <li key={todo.id}>
                  {todo.title} <Badge tone="success">{todo.id}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
