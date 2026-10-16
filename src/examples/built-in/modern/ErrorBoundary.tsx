import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  /** Rendered instead of `children` after a render error; `reset` clears it. */
  fallback: (error: Error, reset: () => void) => ReactNode;
  /** Called when the boundary resets, e.g. to drop a cached rejected promise. */
  onReset?: () => void;
  /** Optional reporting hook (e.g. send to an error tracker). */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** When this value changes, a caught error is cleared (e.g. the user picked another item). */
  resetKey?: unknown;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundaries are still class components: there is no Hook equivalent of
 * `getDerivedStateFromError` / `componentDidCatch`. They catch errors thrown
 * while rendering (including a promise rejected and read with `use`), not
 * errors in event handlers or async code outside React.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    if (this.state.error && !Object.is(previousProps.resetKey, this.props.resetKey)) {
      this.setState({ error: null });
    }
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;
    return error ? this.props.fallback(error, this.reset) : this.props.children;
  }
}
