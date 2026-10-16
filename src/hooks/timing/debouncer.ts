/**
 * Framework-agnostic debounce/throttle engine (same algorithm as lodash's
 * `debounce`). Private to the timing hooks — not exported from the library.
 */

export interface DebounceSettings {
  /** Quiet period in ms. */
  wait: number;
  /** Invoke on the leading edge of a burst. */
  leading: boolean;
  /** Invoke on the trailing edge with the latest arguments. */
  trailing: boolean;
  /** Maximum time a call may be delayed; `wait` when throttling. */
  maxWait: number | undefined;
}

export interface Debouncer<Args extends unknown[]> {
  call: (...args: Args) => void;
  /** Drops a pending invocation. */
  cancel: () => void;
  /** Runs a pending trailing invocation now. */
  flush: () => void;
  /** True while a trailing invocation is scheduled. */
  isPending: () => boolean;
  /**
   * Swaps in the latest callback and settings. When the settings changed, a
   * scheduled timer is re-evaluated against them (measured from the last call).
   */
  configure: (invoke: (...args: Args) => void, settings: DebounceSettings) => void;
  /** Disabled debouncers ignore calls (used after unmount). */
  setEnabled: (enabled: boolean) => void;
}

const sameSettings = (a: DebounceSettings, b: DebounceSettings) =>
  a.wait === b.wait &&
  a.leading === b.leading &&
  a.trailing === b.trailing &&
  a.maxWait === b.maxWait;

export function createDebouncer<Args extends unknown[]>(
  initialInvoke: (...args: Args) => void,
  initialSettings: DebounceSettings,
): Debouncer<Args> {
  let invoke = initialInvoke;
  let currentSettings = initialSettings;
  let lastArgs: Args | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let enabled = true;

  const settings = () => {
    const raw = currentSettings;
    const wait = Math.max(0, raw.wait);
    const maxWait = raw.maxWait === undefined ? undefined : Math.max(raw.maxWait, wait);
    return { ...raw, wait, maxWait };
  };

  const invokeNow = (time: number) => {
    const args = lastArgs;
    lastArgs = undefined;
    lastInvokeTime = time;
    if (args) invoke(...args);
  };

  const remainingWait = (time: number) => {
    const { wait, maxWait } = settings();
    const sinceCall = time - (lastCallTime ?? time);
    const remaining = wait - sinceCall;
    return maxWait === undefined
      ? remaining
      : Math.min(remaining, maxWait - (time - lastInvokeTime));
  };

  const shouldInvoke = (time: number) => {
    if (lastCallTime === undefined) return true;
    const { wait, maxWait } = settings();
    const sinceCall = time - lastCallTime;
    return (
      sinceCall >= wait ||
      sinceCall < 0 || // the system clock went backwards
      (maxWait !== undefined && time - lastInvokeTime >= maxWait)
    );
  };

  const trailingEdge = (time: number) => {
    timerId = undefined;
    if (settings().trailing && lastArgs) invokeNow(time);
    lastArgs = undefined;
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }
    timerId = setTimeout(timerExpired, remainingWait(time));
  };

  const leadingEdge = (time: number) => {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, settings().wait);
    if (settings().leading) invokeNow(time);
  };

  const cancel = () => {
    if (timerId !== undefined) clearTimeout(timerId);
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = undefined;
    timerId = undefined;
  };

  return {
    call: (...args) => {
      if (!enabled) return;
      const time = Date.now();
      const isInvoking = shouldInvoke(time);
      lastArgs = args;
      lastCallTime = time;
      if (isInvoking) {
        if (timerId === undefined) {
          leadingEdge(time);
          return;
        }
        if (settings().maxWait !== undefined) {
          // Called continuously for longer than maxWait: invoke now.
          clearTimeout(timerId);
          timerId = setTimeout(timerExpired, settings().wait);
          invokeNow(time);
          return;
        }
      }
      if (timerId === undefined) timerId = setTimeout(timerExpired, settings().wait);
    },
    cancel,
    flush: () => {
      if (timerId === undefined) return;
      clearTimeout(timerId);
      trailingEdge(Date.now());
    },
    isPending: () => timerId !== undefined && lastArgs !== undefined && settings().trailing,
    configure: (nextInvoke, nextSettings) => {
      invoke = nextInvoke;
      if (sameSettings(currentSettings, nextSettings)) return;
      currentSettings = nextSettings;
      if (timerId === undefined) return;
      clearTimeout(timerId);
      timerId = setTimeout(timerExpired, Math.max(0, remainingWait(Date.now())));
    },
    setEnabled: (next) => {
      enabled = next;
      if (!next) cancel();
    },
  };
}
