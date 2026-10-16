/**
 * Instrumentation for the pipeline demo: wraps each middleware so it can be
 * switched on and off at runtime and records which stages every action passed
 * through. This is demo tooling, not something an app needs.
 */
import { describeAction, type Middleware } from '../../../middleware/reducer';

export const STAGES = [
  'errorReporting',
  'thunk',
  'logger',
  'validation',
  'analytics',
  'persistence',
] as const;

export type StageName = (typeof STAGES)[number];

export type StageOutcome =
  /** Called `next(action)`. */
  | 'passed'
  /** Did not call `next` (thunk ran the function, validation rejected the action, ...). */
  | 'stopped'
  /** Switched off: the action went straight to the next stage. */
  | 'skipped'
  /** The reducer received the action. */
  | 'reduced'
  /** The rest of the chain threw while this stage was running. */
  | 'threw';

export interface TraceStep {
  id: number;
  stage: StageName | 'reducer';
  action: string;
  outcome: StageOutcome;
  /** 0 for the dispatched action, 1+ for actions dispatched while it was processed. */
  depth: number;
}

export type EnabledStages = Record<StageName, boolean>;

export function createPipelineTracer(initiallyEnabled: EnabledStages) {
  let enabled = { ...initiallyEnabled };
  let depth = 0;
  let steps: TraceStep[] = [];
  let nextId = 0;
  const listeners = new Set<(trace: readonly TraceStep[]) => void>();

  const record = (stage: TraceStep['stage'], action: unknown, outcome: StageOutcome) => {
    const step: TraceStep = {
      id: (nextId += 1),
      stage,
      action: describeAction(action),
      outcome,
      depth: depth - 1,
    };
    steps.push(step);
    return step;
  };

  /** Outermost: groups everything one top-level dispatch causes into one trace. */
  const entry =
    <S, A>(): Middleware<S, A> =>
    () =>
    (next) =>
    (action) => {
      if (depth === 0) steps = [];
      depth += 1;
      try {
        next(action);
      } finally {
        depth -= 1;
        if (depth === 0) {
          const trace = steps;
          listeners.forEach((listener) => listener(trace));
        }
      }
    };

  /** Innermost: marks that the action reached the reducer. */
  const reducerProbe =
    <S, A>(): Middleware<S, A> =>
    () =>
    (next) =>
    (action) => {
      record('reducer', action, 'reduced');
      next(action);
    };

  const stage =
    <S, A>(name: StageName, middleware: Middleware<S, A>): Middleware<S, A> =>
    (api) => {
      const withApi = middleware(api);
      return (next) => {
        let forwarded = false;
        const inner = withApi((action) => {
          forwarded = true;
          next(action);
        });
        return (action) => {
          if (!enabled[name]) {
            record(name, action, 'skipped');
            next(action);
            return;
          }
          const step = record(name, action, 'passed');
          const outer = forwarded;
          forwarded = false;
          try {
            inner(action);
            if (!forwarded) step.outcome = 'stopped';
          } catch (error) {
            step.outcome = 'threw';
            throw error;
          } finally {
            forwarded = outer;
          }
        };
      };
    };

  return {
    /** Builds the instrumented chain, in the given order. */
    instrument<S, A>(stages: ReadonlyArray<readonly [StageName, Middleware<S, A>]>) {
      return [
        entry<S, A>(),
        ...stages.map(([name, middleware]) => stage(name, middleware)),
        reducerProbe<S, A>(),
      ];
    },
    setEnabled(name: StageName, value: boolean) {
      enabled = { ...enabled, [name]: value };
    },
    subscribe(listener: (trace: readonly TraceStep[]) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type PipelineTracer = ReturnType<typeof createPipelineTracer>;
