/**
 * A mock error-reporting client (think Sentry/Bugsnag) that "sends" reports
 * to an on-screen list instead of a server. Kept in a `createStore` store so
 * it can be called from class components, event handlers and hooks alike.
 */
import { createStore, type ExternalStore } from '../../../hooks';

export type ErrorSource = 'render (boundary)' | 'event handler' | 'effect' | 'retry';

export interface ErrorReport {
  id: number;
  source: ErrorSource;
  message: string;
  /** First frames of React's component stack, when the boundary provided one. */
  componentStack?: string;
}

export interface ReporterState {
  reports: readonly ErrorReport[];
}

export interface ErrorReporter {
  store: ExternalStore<ReporterState>;
  report: (source: ErrorSource, error: unknown, componentStack?: string | null) => void;
  clear: () => void;
}

export function createErrorReporter(limit = 20): ErrorReporter {
  const store = createStore<ReporterState>({ reports: [] });
  let id = 0;
  return {
    store,
    report(source, error, componentStack) {
      id += 1;
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      const stack = componentStack?.trim().split('\n').slice(0, 2).join(' ← ').replace(/\s+/g, ' ');
      const report: ErrorReport = {
        id,
        source,
        message,
        ...(stack ? { componentStack: stack } : {}),
      };
      store.setState((state) => ({ reports: [report, ...state.reports].slice(0, limit) }));
    },
    clear() {
      store.setState({ reports: [] });
    },
  };
}
