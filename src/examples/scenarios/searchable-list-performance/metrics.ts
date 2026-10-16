/**
 * Measurements for the search benchmark, kept in an external store so that
 * recording a number (from a Profiler callback or a layout effect) never
 * re-renders the measured list itself — only the metrics table subscribes.
 */
import { createStore, type ExternalStore } from '../../../hooks';

export type Strategy = 'naive' | 'deferred' | 'transition' | 'windowed';

export const STRATEGIES: ReadonlyArray<{ id: Strategy; label: string }> = [
  { id: 'naive', label: 'Naive: filter + render every row on each keystroke' },
  { id: 'deferred', label: 'useDeferredValue + memoised rows' },
  { id: 'transition', label: 'useTransition + memoised rows' },
  { id: 'windowed', label: 'useDeferredValue + windowing (visible rows only)' },
];

export interface StrategyMetrics {
  /** Keystroke (event handler) → list committed (layout effect), ms. Newest last. */
  latencies: number[];
  /** `<Profiler>` actualDuration of list commits, ms. Dev/profiling builds only. */
  listRenders: number[];
  /** `<Profiler>` actualDuration of the commit containing the keystroke, ms. */
  keystrokeCommits: number[];
  rowsInDom: number;
}

export interface MetricsState {
  byStrategy: Record<Strategy, StrategyMetrics>;
}

const KEEP = 20;
const empty = (): StrategyMetrics => ({
  latencies: [],
  listRenders: [],
  keystrokeCommits: [],
  rowsInDom: 0,
});
const push = (list: number[], value: number) => [...list, value].slice(-KEEP);

export interface MetricsRecorder {
  store: ExternalStore<MetricsState>;
  /** Call from the input's change handler. */
  markInput: (strategy: Strategy, at: number) => void;
  /** Call from a layout effect once the list for the latest query is in the DOM. */
  listCommitted: (strategy: Strategy, at: number, rowsInDom: number) => void;
  /** `<Profiler>` callback data. */
  profiled: (strategy: Strategy, kind: 'list' | 'whole', actualDuration: number) => void;
  reset: () => void;
}

export function createMetricsRecorder(): MetricsRecorder {
  const store = createStore<MetricsState>({
    byStrategy: { naive: empty(), deferred: empty(), transition: empty(), windowed: empty() },
  });
  // Bookkeeping that must not trigger renders lives outside the state.
  let inputAt: number | null = null;
  let awaitingKeystrokeCommit = false;

  const patch = (strategy: Strategy, update: (metrics: StrategyMetrics) => StrategyMetrics) =>
    store.setState((state) => ({
      byStrategy: { ...state.byStrategy, [strategy]: update(state.byStrategy[strategy]) },
    }));

  return {
    store,
    markInput(_strategy, at) {
      inputAt = at;
      awaitingKeystrokeCommit = true;
    },
    listCommitted(strategy, at, rowsInDom) {
      const started = inputAt;
      inputAt = null;
      patch(strategy, (metrics) => ({
        ...metrics,
        rowsInDom,
        latencies: started === null ? metrics.latencies : push(metrics.latencies, at - started),
      }));
    },
    profiled(strategy, kind, actualDuration) {
      if (kind === 'list') {
        patch(strategy, (metrics) => ({
          ...metrics,
          listRenders: push(metrics.listRenders, actualDuration),
        }));
      } else if (awaitingKeystrokeCommit) {
        awaitingKeystrokeCommit = false;
        patch(strategy, (metrics) => ({
          ...metrics,
          keystrokeCommits: push(metrics.keystrokeCommits, actualDuration),
        }));
      }
    },
    reset() {
      inputAt = null;
      awaitingKeystrokeCommit = false;
      store.setState(store.getInitialState(), true);
    },
  };
}

export function summarize(
  values: readonly number[],
): { last: number; median: number; max: number } | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0);
  return { last: values[values.length - 1] ?? 0, median, max: sorted[sorted.length - 1] ?? 0 };
}
