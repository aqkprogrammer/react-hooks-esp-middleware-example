import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { noop } from '../internal/env';
import { useLatest } from '../state/useLatest';

export type SSEStatus = 'connecting' | 'open' | 'closed';

export interface SSEMessage<T> {
  /** Event type: `'message'` for unnamed events, otherwise the `event:` field. */
  type: string;
  data: T;
  /** The `id:` field (sent back by the browser as `Last-Event-ID` on reconnect). */
  lastEventId: string;
}

export interface UseSSEOptions<T> {
  /** Event types to listen for. Default `['message']`. Keep it stable (module constant). */
  eventTypes?: readonly string[];
  /** Send cookies on cross-origin requests. Default `false`. */
  withCredentials?: boolean;
  /** Default: `JSON.parse`, falling back to the raw string. A type assertion, not validation. */
  parse?: (data: string, type: string) => T;
  /** How many messages `messages` keeps. Default `50`. */
  historyLimit?: number;
  onMessage?: (message: SSEMessage<T>) => void;
  onError?: (event: Event) => void;
}

export interface UseSSEResult<T> {
  isSupported: boolean;
  status: SSEStatus;
  lastMessage: SSEMessage<T> | undefined;
  /** Oldest first, at most `historyLimit`. */
  messages: SSEMessage<T>[];
  /** Closes the stream; the browser will not reconnect. Stable. */
  close: () => void;
  /** Opens a new stream (after `close()` or a fatal error). Stable. */
  reconnect: () => void;
}

const DEFAULT_TYPES: readonly string[] = ['message'];

function defaultParse<T>(data: string): T {
  try {
    return JSON.parse(data) as T;
  } catch {
    return data as T;
  }
}

const subscribeNothing = () => noop;
const getSupported = () => typeof EventSource !== 'undefined';
const getServerSupported = () => false;

/**
 * Subscribes to a Server-Sent Events stream with `EventSource`.
 *
 * ```tsx
 * const feed = useSSE<Tick>('/api/events');
 * ```
 *
 * - The **browser** reconnects automatically after network errors (status
 *   goes back to `connecting`), resending `Last-Event-ID`. When the server
 *   answers with a non-200 status or wrong content type, the stream fails
 *   permanently (`closed`); call `reconnect()` to try again.
 * - Unmount, `url` changes, `close()` and `reconnect()` close the old
 *   `EventSource`; listeners are removed first, so no updates arrive late.
 * - SSE is one-way (server → client) over plain HTTP; use a WebSocket when
 *   the client must also send. `EventSource` cannot set request headers, so
 *   authenticate with cookies (`withCredentials`) rather than tokens in the URL.
 */
export function useSSE<T = unknown>(
  url: string | null,
  options: UseSSEOptions<T> = {},
): UseSSEResult<T> {
  const { eventTypes = DEFAULT_TYPES, withCredentials = false } = options;
  const optionsRef = useLatest(options);
  const isSupported = useSyncExternalStore(subscribeNothing, getSupported, getServerSupported);
  const sourceRef = useRef<EventSource | null>(null);
  const [version, setVersion] = useState(0);
  const typesKey = eventTypes.join('\n');
  const key = `${version}|${url ?? ''}|${typesKey}|${String(withCredentials)}`;
  const [connection, setConnection] = useState<{ key: string; status: SSEStatus }>({
    key,
    status: 'connecting',
  });
  const [messages, setMessages] = useState<SSEMessage<T>[]>([]);

  useEffect(() => {
    if (url === null || typeof EventSource === 'undefined') return;
    const source = new EventSource(url, { withCredentials });
    sourceRef.current = source;
    const setStatus = (status: SSEStatus) => setConnection({ key, status });

    const onOpen = () => setStatus('open');
    const onError = (event: Event) => {
      // CONNECTING = the browser will retry; CLOSED = fatal, no retry.
      setStatus(source.readyState === EventSource.CLOSED ? 'closed' : 'connecting');
      optionsRef.current.onError?.(event);
    };
    const onEvent = (event: Event) => {
      const { data, lastEventId } = event as MessageEvent<string>;
      const { parse = defaultParse<T>, historyLimit = 50, onMessage } = optionsRef.current;
      let parsed: T;
      try {
        parsed = parse(data, event.type);
      } catch {
        optionsRef.current.onError?.(event);
        return;
      }
      const message: SSEMessage<T> = { type: event.type, data: parsed, lastEventId };
      setMessages((previous) => [...previous, message].slice(-Math.max(1, historyLimit)));
      onMessage?.(message);
    };

    const types = typesKey.split('\n');
    source.addEventListener('open', onOpen);
    source.addEventListener('error', onError);
    types.forEach((type) => source.addEventListener(type, onEvent));
    return () => {
      source.removeEventListener('open', onOpen);
      source.removeEventListener('error', onError);
      types.forEach((type) => source.removeEventListener(type, onEvent));
      source.close();
      if (sourceRef.current === source) sourceRef.current = null;
    };
  }, [url, typesKey, withCredentials, key, optionsRef]);

  const close = useCallback(() => {
    const source = sourceRef.current;
    if (!source) return;
    source.close();
    sourceRef.current = null;
    setConnection((previous) => ({ ...previous, status: 'closed' }));
  }, []);
  const reconnect = useCallback(() => setVersion((previous) => previous + 1), []);

  const status: SSEStatus =
    url === null || !isSupported
      ? 'closed'
      : connection.key === key
        ? connection.status
        : 'connecting';

  return {
    isSupported,
    status,
    lastMessage: messages[messages.length - 1],
    messages,
    close,
    reconnect,
  };
}
