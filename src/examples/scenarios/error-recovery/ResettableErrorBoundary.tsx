import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface FallbackProps {
  error: Error;
  /** Clears the error and renders the children again. */
  resetErrorBoundary: () => void;
}

export interface ResettableErrorBoundaryProps {
  children: ReactNode;
  fallbackRender: (props: FallbackProps) => ReactNode;
  /** Report the error (logging service, on-screen reporter…). */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Runs before a reset caused by `resetErrorBoundary` — fix the cause here. */
  onReset?: () => void;
  /** When any value changes (`Object.is`), an active error is cleared automatically. */
  resetKeys?: readonly unknown[];
}

interface State {
  error: Error | null;
}

const changed = (a: readonly unknown[] = [], b: readonly unknown[] = []) =>
  a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]));

/**
 * Error boundaries must be class components: React has no hook for
 * `getDerivedStateFromError` / `componentDidCatch`. This one adds the two
 * things a real app needs — a reset function for "Try again" and `resetKeys`
 * so navigating to other data clears the error (the same API shape as the
 * `react-error-boundary` package).
 *
 * Boundaries catch errors thrown while **rendering**, in lifecycle methods
 * and in effects of their children — not in event handlers, timers or
 * promise callbacks; surface those through state.
 */
export class ResettableErrorBoundary extends Component<ResettableErrorBoundaryProps, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(previous: ResettableErrorBoundaryProps): void {
    if (this.state.error && changed(previous.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error)
      return this.props.fallbackRender({ error, resetErrorBoundary: this.resetErrorBoundary });
    return this.props.children;
  }
}
