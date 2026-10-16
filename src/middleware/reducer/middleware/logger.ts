import type { Middleware } from '../types';

/** One logged dispatch: the action and the state before and after it. */
export interface LogRecord<S, A> {
  action: A;
  prevState: S;
  nextState: S;
  /** `false` when the reducer returned the same state (or a later middleware swallowed the action). */
  changed: boolean;
  /** Time spent in the rest of the chain (later middleware + reducer), in milliseconds. */
  durationMs: number;
}

/** Receives every log record. Swap it to send logs to the screen, a buffer or a test spy. */
export type LogSink<S, A> = (record: LogRecord<S, A>) => void;

/** The subset of `console` the default sink uses (injectable for tests). */
export type LoggerConsole = Pick<Console, 'group' | 'groupCollapsed' | 'groupEnd' | 'log'>;

export interface LoggerOptions<S, A> {
  /** Where records go. Defaults to {@link createConsoleSink}. */
  sink?: LogSink<S, A>;
  /** Only log actions for which this returns `true` (e.g. skip high-frequency actions). */
  predicate?: (action: A, state: S) => boolean;
  /** Clock used for `durationMs`. Defaults to `performance.now`. */
  now?: () => number;
}

/** Best-effort label for any action: its `type`, `"thunk"` for functions, else its JSON. */
export function describeAction(action: unknown): string {
  if (typeof action === 'function') return 'thunk';
  if (typeof action === 'object' && action !== null && 'type' in action) {
    return String((action as { type: unknown }).type);
  }
  return String(action);
}

/**
 * The classic redux-logger output: one console group per action with the
 * previous state, the action and the next state.
 */
export function createConsoleSink<S, A>(
  options: { collapsed?: boolean; console?: LoggerConsole } = {},
): LogSink<S, A> {
  const { collapsed = true } = options;
  return (record) => {
    const out = options.console ?? console;
    const title = `action ${describeAction(record.action)} (${record.durationMs.toFixed(1)} ms)`;
    if (collapsed) out.groupCollapsed(title);
    else out.group(title);
    out.log('prev state', record.prevState);
    out.log('action', record.action);
    out.log('next state', record.nextState);
    out.groupEnd();
  };
}

/**
 * Logs every action that passes through it with the state before and after.
 *
 * Place it *after* middleware that turn non-actions into actions (thunk) and
 * *before* middleware that may swallow actions (validation) if you want to
 * see rejected actions too. The record is emitted after `next(action)`
 * returns, so actions dispatched *during* `next` (e.g. a validation failure)
 * are logged before the action that caused them.
 *
 * If a later middleware or the reducer throws, nothing is logged for that
 * action and the error propagates unchanged.
 */
export function createLogger<S, A>(options: LoggerOptions<S, A> = {}): Middleware<S, A> {
  const sink = options.sink ?? createConsoleSink<S, A>();
  const now = options.now ?? (() => performance.now());
  return (api) => (next) => (action) => {
    const prevState = api.getState();
    if (options.predicate && !options.predicate(action, prevState)) {
      next(action);
      return;
    }
    const startedAt = now();
    next(action);
    const nextState = api.getState();
    sink({
      action,
      prevState,
      nextState,
      changed: !Object.is(prevState, nextState),
      durationMs: now() - startedAt,
    });
  };
}
