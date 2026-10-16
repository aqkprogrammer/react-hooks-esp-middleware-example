import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { noop } from '../internal/env';
import { useLatest } from '../state/useLatest';
import { computeBackoff, type BackoffOptions } from './backoff';

export type SocketStatus = 'connecting' | 'open' | 'closing' | 'closed';

export interface ReconnectOptions extends BackoffOptions {
  /** Reconnect attempts after an unexpected close before giving up. Default `5`. */
  maxAttempts?: number;
  /**
   * A connection must stay open this long before the attempt counter resets.
   * Without it, a server that accepts and immediately drops connections
   * would be retried forever at the shortest delay. Default `5000`.
   */
  stableAfterMs?: number;
}

export interface UseWebSocketOptions<T> {
  protocols?: string | string[];
  /**
   * Turns `MessageEvent.data` into a message. Default: `JSON.parse` for
   * strings (falling back to the raw string), other data as-is. The default
   * is a type assertion — validate untrusted data in your own `parse`.
   */
  parse?: (data: unknown) => T;
  /** How many messages `messages` keeps (oldest dropped first). Default `50`. */
  historyLimit?: number;
  /** Reconnect with exponential backoff after an unexpected close. `false` disables. */
  reconnect?: false | ReconnectOptions;
  onOpen?: (event: Event) => void;
  onMessage?: (message: T, event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export interface UseWebSocketResult<T> {
  status: SocketStatus;
  /** Most recent message, or `undefined`. */
  lastMessage: T | undefined;
  /** Up to `historyLimit` messages, oldest first. */
  messages: T[];
  /** Sends when the socket is open; returns `false` (and sends nothing) otherwise. Stable. */
  send: (data: Parameters<WebSocket['send']>[0]) => boolean;
  /** `send(JSON.stringify(value))`. Stable. */
  sendJson: (value: unknown) => boolean;
  /** Closes the socket on purpose — no reconnect until `reconnect()` or a new URL. Stable. */
  close: (code?: number, reason?: string) => void;
  /** Opens a fresh connection now and resets the attempt counter. Stable. */
  reconnect: () => void;
  /** Number of the reconnect attempt in progress or scheduled (`0` when connected). */
  reconnectAttempt: number;
  /** Gave up after `maxAttempts` failed reconnects. */
  gaveUp: boolean;
  clearMessages: () => void;
  /** `false` on the server and in environments without `WebSocket`. */
  isSupported: boolean;
}

interface ConnectionState {
  /** Identifies the connection this status belongs to (URL + manual reconnects). */
  key: string;
  status: SocketStatus;
  reconnectAttempt: number;
  gaveUp: boolean;
}

function defaultParse<T>(data: unknown): T {
  if (typeof data !== 'string') return data as T;
  try {
    return JSON.parse(data) as T;
  } catch {
    return data as T;
  }
}

const subscribeNothing = () => noop;
const getSupported = () => typeof WebSocket !== 'undefined';
const getServerSupported = () => false;

/**
 * Manages one WebSocket connection for the lifetime of the component.
 *
 * ```tsx
 * const live = useWebSocket<ServerMessage>('wss://example.com/live');
 * live.sendJson({ type: 'ping' });
 * ```
 *
 * - Connects when mounted (and when `url` changes); `null` disconnects.
 * - Unexpected closes reconnect with exponential backoff and jitter, up to
 *   `reconnect.maxAttempts` failures in a row (the count resets once a
 *   connection stays up for `stableAfterMs`); `close()` and unmounting never reconnect.
 * - Keeps the last `historyLimit` messages, so a chatty server cannot grow
 *   memory without bound.
 * - Unmount closes the socket and cancels any pending reconnect; handlers are
 *   detached first, so no state updates happen after unmount.
 * - `onMessage` and friends may be inline functions (the latest is called).
 *
 * `send` does not queue while disconnected — it returns `false` so the UI can
 * say so. Sharing one socket between many components needs a module-level
 * client or context, not one hook per component.
 */
export function useWebSocket<T = unknown>(
  url: string | null,
  options: UseWebSocketOptions<T> = {},
): UseWebSocketResult<T> {
  const { protocols, historyLimit = 50 } = options;
  const optionsRef = useLatest(options);
  const isSupported = useSyncExternalStore(subscribeNothing, getSupported, getServerSupported);
  const socketRef = useRef<WebSocket | null>(null);
  const closeRef = useRef<(code?: number, reason?: string) => void>(noop);
  const [version, setVersion] = useState(0);
  const [messages, setMessages] = useState<T[]>([]);
  const protocolsKey = JSON.stringify(protocols ?? null);
  const key = `${version}|${url ?? ''}|${protocolsKey}`;
  const [connection, setConnection] = useState<ConnectionState>({
    key,
    status: 'connecting',
    reconnectAttempt: 0,
    gaveUp: false,
  });

  useEffect(() => {
    if (url === null || typeof WebSocket === 'undefined') return;
    const parsedProtocols = JSON.parse(protocolsKey) as string | string[] | null;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stableTimer: ReturnType<typeof setTimeout> | undefined;
    // Failed connections since the last *stable* one; drives the backoff.
    let attempt = 0;
    let disposed = false;
    let manuallyClosed = false;

    const update = (patch: Partial<Omit<ConnectionState, 'key'>>) =>
      setConnection((previous) => {
        const base: ConnectionState =
          previous.key === key
            ? previous
            : { key, status: 'connecting', reconnectAttempt: 0, gaveUp: false };
        return { ...base, ...patch };
      });

    const connect = () => {
      const ws =
        parsedProtocols === null ? new WebSocket(url) : new WebSocket(url, parsedProtocols);
      socket = ws;
      socketRef.current = ws;
      ws.onopen = (event) => {
        const policy = optionsRef.current.reconnect;
        stableTimer = setTimeout(
          () => {
            attempt = 0;
          },
          (policy ? policy.stableAfterMs : undefined) ?? 5000,
        );
        update({ status: 'open', reconnectAttempt: 0, gaveUp: false });
        optionsRef.current.onOpen?.(event);
      };
      ws.onmessage = (event: MessageEvent) => {
        const { parse = defaultParse<T>, historyLimit: limit = 50, onMessage } = optionsRef.current;
        let message: T;
        try {
          message = parse(event.data);
        } catch (error) {
          optionsRef.current.onError?.(new ErrorEvent('error', { error }));
          return;
        }
        setMessages((previous) => [...previous, message].slice(-Math.max(1, limit)));
        onMessage?.(message, event);
      };
      ws.onerror = (event) => optionsRef.current.onError?.(event);
      ws.onclose = (event) => {
        if (disposed) return;
        clearTimeout(stableTimer);
        socketRef.current = null;
        optionsRef.current.onClose?.(event);
        const policy = optionsRef.current.reconnect;
        const maxAttempts = policy === false ? 0 : (policy?.maxAttempts ?? 5);
        if (manuallyClosed || attempt >= maxAttempts) {
          update({ status: 'closed', gaveUp: !manuallyClosed && maxAttempts > 0 });
          return;
        }
        attempt += 1;
        update({ status: 'connecting', reconnectAttempt: attempt });
        timer = setTimeout(connect, computeBackoff(attempt, policy || {}));
      };
    };

    closeRef.current = (code, reason) => {
      manuallyClosed = true;
      clearTimeout(timer);
      if (socket && socket.readyState < WebSocket.CLOSING) {
        update({ status: 'closing' });
        socket.close(code, reason);
      } else {
        update({ status: 'closed' });
      }
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(stableTimer);
      closeRef.current = noop;
      socketRef.current = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'unmount');
    };
  }, [url, protocolsKey, key, optionsRef]);

  const send = useCallback<UseWebSocketResult<T>['send']>((data) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(data);
    return true;
  }, []);
  const sendJson = useCallback((value: unknown) => send(JSON.stringify(value)), [send]);
  const close = useCallback((code?: number, reason?: string) => closeRef.current(code, reason), []);
  const reconnect = useCallback(() => setVersion((previous) => previous + 1), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  const visibleMessages = messages.length > historyLimit ? messages.slice(-historyLimit) : messages;
  // Before the effect reports anything for the current connection, it is connecting.
  const current: ConnectionState =
    connection.key === key
      ? connection
      : { key, status: 'connecting', reconnectAttempt: 0, gaveUp: false };
  const status: SocketStatus = url === null || !isSupported ? 'closed' : current.status;

  return {
    status,
    lastMessage: visibleMessages[visibleMessages.length - 1],
    messages: visibleMessages,
    send,
    sendJson,
    close,
    reconnect,
    reconnectAttempt: current.reconnectAttempt,
    gaveUp: current.gaveUp,
    clearMessages,
    isSupported,
  };
}
