import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { noop, toError } from '../internal/env';
import { useLatest } from '../state/useLatest';

export interface UseBroadcastChannelOptions<T> {
  /** Called for every valid message from *other* contexts. May be an inline function. */
  onMessage?: (message: T, event: MessageEvent) => void;
  /**
   * Runtime guard. Messages come from any same-origin tab, including tabs
   * still running an older version of your app — validate them.
   */
  validate?: (data: unknown) => data is T;
  /** Unclonable messages (`DataCloneError`), `messageerror` events and failed validation. */
  onError?: (error: Error) => void;
}

export interface UseBroadcastChannelResult<T> {
  /** `false` on the server and in browsers without `BroadcastChannel`. */
  isSupported: boolean;
  /** Sends to every *other* tab/frame/worker on the channel. `false` if it could not be sent. Stable. */
  postMessage: (message: T) => boolean;
  /** The most recent valid message received, if any. */
  lastMessage: T | undefined;
}

const subscribeNothing = () => noop;
const getSupported = () => typeof BroadcastChannel !== 'undefined';
const getServerSupported = () => false;

/**
 * Typed messaging between same-origin tabs, windows, iframes and workers
 * with the `BroadcastChannel` API.
 *
 * ```tsx
 * type Msg = { type: 'logout' } | { type: 'cart-updated'; count: number };
 * const { postMessage } = useBroadcastChannel<Msg>('app', {
 *   onMessage: (msg) => { if (msg.type === 'logout') signOutLocally(); },
 * });
 * ```
 *
 * - The sender never receives its own message; other instances in the same
 *   tab do.
 * - Messages are copied with the structured clone algorithm: `Map`, `Set`,
 *   `Date` and `Blob` work, functions and DOM nodes throw `DataCloneError`
 *   (reported through `onError`; `postMessage` returns `false`).
 * - The channel is closed on unmount and when `name` changes; pass `null` to disconnect.
 * - Nothing is persisted: tabs opened later do not see earlier messages.
 */
export function useBroadcastChannel<T>(
  name: string | null,
  options: UseBroadcastChannelOptions<T> = {},
): UseBroadcastChannelResult<T> {
  const optionsRef = useLatest(options);
  const isSupported = useSyncExternalStore(subscribeNothing, getSupported, getServerSupported);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [lastMessage, setLastMessage] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (name === null || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(name);
    channelRef.current = channel;
    const onMessage = (event: MessageEvent) => {
      const { validate, onMessage: handler, onError } = optionsRef.current;
      if (validate && !validate(event.data)) {
        onError?.(new TypeError(`Ignored an invalid message on channel "${name}"`));
        return;
      }
      const message = event.data as T;
      setLastMessage(() => message);
      handler?.(message, event);
    };
    const onMessageError = () =>
      optionsRef.current.onError?.(new Error(`A message on "${name}" could not be deserialised`));
    channel.addEventListener('message', onMessage);
    channel.addEventListener('messageerror', onMessageError);
    return () => {
      channel.removeEventListener('message', onMessage);
      channel.removeEventListener('messageerror', onMessageError);
      channel.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [name, optionsRef]);

  const postMessage = useCallback(
    (message: T) => {
      const channel = channelRef.current;
      if (!channel) return false;
      try {
        channel.postMessage(message);
        return true;
      } catch (error) {
        optionsRef.current.onError?.(toError(error));
        return false;
      }
    },
    [optionsRef],
  );

  return { isSupported, postMessage, lastMessage };
}
