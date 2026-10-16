import { useCallback, useEffect, useEffectEvent, useReducer } from 'react';

/** Events are a discriminated union on `type`: `{ type: 'FETCH' } | { type: 'RESOLVE'; data: Item[] }`. */
export interface MachineEvent {
  type: string;
}

/** A transition with options. Omitting `target` updates context without leaving the state. */
export interface MachineTransitionConfig<S extends string, C, E extends MachineEvent> {
  target?: S;
  /** Pure predicate; the transition is skipped when it returns `false`. */
  guard?: (context: C, event: E) => boolean;
  /** Pure function returning the next context. */
  assign?: (context: C, event: E) => C;
}

/** A target state, a transition object, or candidates tried in order (first passing guard wins). */
export type MachineTransition<S extends string, C, E extends MachineEvent> =
  S | MachineTransitionConfig<S, C, E> | ReadonlyArray<MachineTransitionConfig<S, C, E>>;

export interface EntryActionArgs<S extends string, C, E extends MachineEvent> {
  /** The state that was entered. */
  state: S;
  context: C;
  /** The event that caused the transition (`null` for the initial state). */
  event: E | null;
  /** Send events from timers, subscriptions, promises… */
  send: (event: E) => void;
}

export interface StateNodeConfig<S extends string, C, E extends MachineEvent> {
  /** Transitions keyed by event type; the event parameter is narrowed per key. */
  on?: { [T in E['type']]?: MachineTransition<S, C, Extract<E, { type: T }>> };
  /**
   * Side effect run **after commit** when the state is entered (it runs in a
   * `useEffect`). Return a cleanup function to undo it when the state is left
   * or the component unmounts — e.g. clear a timer or abort a request.
   */
  entry?: (args: EntryActionArgs<S, C, E>) => void | (() => void);
}

export interface MachineConfig<S extends string, C, E extends MachineEvent> {
  initial: S;
  context: C;
  states: { [K in S]: StateNodeConfig<S, C, E> };
}

export interface MachineSnapshot<S extends string, C, E extends MachineEvent> {
  value: S;
  context: C;
  /** The last event that was accepted (`null` initially). */
  event: E | null;
  /** Increases on every accepted transition; distinguishes re-entries of the same state. */
  version: number;
}

export interface StateMachine<S extends string, C, E extends MachineEvent> {
  /** Current state name — narrow on it with `switch`/`if`. */
  value: S;
  context: C;
  /** Sends an event. Ignored when the current state has no transition for it. */
  send: (event: E) => void;
  /** Whether `event` would be accepted right now (guards included). */
  can: (event: E) => boolean;
  /** Shorthand for `value === state`. */
  matches: (state: S) => boolean;
}

function toCandidates<S extends string, C, E extends MachineEvent>(
  transition: MachineTransition<S, C, E>,
): ReadonlyArray<MachineTransitionConfig<S, C, E>> {
  if (typeof transition === 'string') return [{ target: transition }];
  if (Array.isArray(transition))
    return transition as ReadonlyArray<MachineTransitionConfig<S, C, E>>;
  return [transition as MachineTransitionConfig<S, C, E>];
}

/**
 * The pure transition function: given a snapshot and an event, returns the
 * next snapshot, or the *same* snapshot when the event is not accepted (so
 * React bails out of rendering). Exported for unit tests and reuse outside
 * React.
 */
export function machineTransition<S extends string, C, E extends MachineEvent>(
  config: MachineConfig<S, C, E>,
  snapshot: MachineSnapshot<S, C, E>,
  event: E,
): MachineSnapshot<S, C, E> {
  const handlers = config.states[snapshot.value].on as
    Partial<Record<string, MachineTransition<S, C, E>>> | undefined;
  const handler = handlers?.[event.type];
  if (handler === undefined) return snapshot;

  for (const candidate of toCandidates(handler)) {
    if (candidate.guard && !candidate.guard(snapshot.context, event)) continue;
    return {
      value: candidate.target ?? snapshot.value,
      context: candidate.assign ? candidate.assign(snapshot.context, event) : snapshot.context,
      event,
      // Only real state changes (or explicit re-targets) count as an entry.
      version: candidate.target === undefined ? snapshot.version : snapshot.version + 1,
    };
  }
  return snapshot;
}

/**
 * A typed finite state machine on top of `useReducer`.
 *
 * - **States** are a string union, **events** a discriminated union; each
 *   state lists the events it accepts, so impossible transitions
 *   (e.g. `RESOLVE` while `idle`) are simply ignored instead of corrupting state.
 * - **Guards** pick between candidate transitions; **assign** updates the
 *   extended state (`context`). Both must be pure: they run inside the reducer,
 *   which React may call more than once.
 * - **Entry actions** are effects: they run after commit when a state is
 *   entered and may return a cleanup that runs when it is left. Use them for
 *   timers and requests that belong to a state.
 *
 * Self-transitions with an explicit `target` re-enter the state (entry runs
 * again); transitions without `target` only update context.
 *
 * In Strict Mode development builds entry effects run, clean up and run again
 * on mount, like any effect — make them idempotent via their cleanup.
 */
export function useStateMachine<S extends string, C, E extends MachineEvent>(
  config: MachineConfig<S, C, E>,
): StateMachine<S, C, E> {
  // The reducer closes over the latest `config`; React always uses the reducer
  // from the current render, so guards see fresh values.
  const [snapshot, send] = useReducer(
    (current: MachineSnapshot<S, C, E>, event: E) => machineTransition(config, current, event),
    config,
    (initialConfig): MachineSnapshot<S, C, E> => ({
      value: initialConfig.initial,
      context: initialConfig.context,
      event: null,
      version: 0,
    }),
  );

  const runEntry = useEffectEvent((entered: S) =>
    config.states[entered].entry?.({
      state: entered,
      context: snapshot.context,
      event: snapshot.event,
      send,
    }),
  );

  // Re-run only when a state is entered (value change or explicit re-entry),
  // not when context changes inside the same state.
  useEffect(() => {
    const cleanup = runEntry(snapshot.value);
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [snapshot.value, snapshot.version]);

  const can = useCallback(
    (event: E) => machineTransition(config, snapshot, event) !== snapshot,
    [config, snapshot],
  );
  const matches = useCallback((state: S) => snapshot.value === state, [snapshot.value]);

  return { value: snapshot.value, context: snapshot.context, send, can, matches };
}
