import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
  /** Changing this value resets the boundary (e.g. the current route). */
  resetKey?: unknown;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
  resetKey: unknown;
}

/** Error boundaries are still class components — there is no hook equivalent. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return Object.is(props.resetKey, state.resetKey)
      ? null
      : { error: null, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  override render() {
    return this.state.error
      ? this.props.fallback(this.state.error, this.reset)
      : this.props.children;
  }
}
