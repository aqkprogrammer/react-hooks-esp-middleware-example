import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Component, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createErrorReporter } from './errorReporter';
import { ErrorRecoveryLab } from './ErrorRecoveryLab';
import ErrorRecoveryScenario from './ErrorRecoveryScenario';
import { ResettableErrorBoundary } from './ResettableErrorBoundary';

const panel = (name: RegExp) => within(screen.getByRole('region', { name }));
const reports = () => screen.getByRole('list', { name: 'Reported errors' });
const quietReactErrors = () => vi.spyOn(console, 'error').mockImplementation(() => {});

describe('ResettableErrorBoundary', () => {
  function Bomb({ explode }: { explode: boolean }): ReactNode {
    if (explode) throw new Error('boom');
    return 'safe';
  }

  it('catches, reports, resets via the callback and via resetKeys', async () => {
    quietReactErrors();
    const onError = vi.fn();
    const onReset = vi.fn();
    const ui = (explode: boolean, key: number) => (
      <ResettableErrorBoundary
        onError={onError}
        onReset={onReset}
        resetKeys={[key]}
        fallbackRender={({ error, resetErrorBoundary }) => (
          <button type="button" onClick={resetErrorBoundary}>
            {error.message}
          </button>
        )}
      >
        <Bomb explode={explode} />
      </ResettableErrorBoundary>
    );
    const { rerender } = render(ui(true, 1));
    expect(screen.getByRole('button', { name: 'boom' })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' }),
      expect.anything(),
    );
    // Fixing the cause alone does not clear the boundary…
    rerender(ui(false, 1));
    expect(screen.getByRole('button', { name: 'boom' })).toBeInTheDocument();
    // …a changed reset key does.
    rerender(ui(false, 2));
    expect(screen.getByText('safe')).toBeInTheDocument();
    expect(onReset).not.toHaveBeenCalled();

    rerender(ui(true, 2));
    await userEvent.setup().click(screen.getByRole('button', { name: 'boom' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('does not catch errors thrown in event handlers', async () => {
    // Documented React behaviour, verified: the handler error escapes the boundary.
    class Probe extends Component<{ children: ReactNode }, { caught: boolean }> {
      override state = { caught: false };
      static getDerivedStateFromError() {
        return { caught: true };
      }
      override render() {
        return this.state.caught ? 'caught' : this.props.children;
      }
    }
    const onWindowError = vi.fn((event: ErrorEvent) => event.preventDefault());
    window.addEventListener('error', onWindowError);
    quietReactErrors();
    render(
      <Probe>
        <button
          type="button"
          onClick={() => {
            throw new Error('handler failure');
          }}
        >
          throw
        </button>
      </Probe>,
    );
    screen.getByRole('button', { name: 'throw' }).click();
    expect(screen.queryByText('caught')).not.toBeInTheDocument();
    expect(onWindowError).toHaveBeenCalled();
    window.removeEventListener('error', onWindowError);
  });
});

describe('errorReporter', () => {
  it('formats reports and trims component stacks', () => {
    const reporter = createErrorReporter(2);
    reporter.report('retry', new TypeError('a'), '\n    at A\n    at B\n    at C');
    reporter.report('effect', 'plain string');
    reporter.report('event handler', new Error('c'));
    const { reports } = reporter.store.getState();
    expect(reports.map((report) => report.message)).toEqual(['Error: c', 'plain string']);
    reporter.clear();
    expect(reporter.store.getState().reports).toEqual([]);
  });
});

describe('ErrorRecoveryLab', () => {
  it('shows a boundary fallback for render errors; "Try again" alone fails again', async () => {
    quietReactErrors();
    const user = userEvent.setup();
    render(<ErrorRecoveryLab retryBaseDelayMs={10} />);
    const demo = panel(/1\. Render error/);
    expect(demo.getByText('Grace Hopper')).toBeInTheDocument();
    await user.click(demo.getByLabelText('Server returns malformed profile data'));
    expect(demo.getByRole('alert')).toHaveTextContent(
      "Cannot read properties of null (reading 'name')",
    );
    expect(reports()).toHaveTextContent('render (boundary)');
    expect(reports()).toHaveTextContent('ProfileCard');

    await user.click(demo.getByRole('button', { name: 'Try again' }));
    expect(demo.getByRole('alert')).toBeInTheDocument();
    expect(within(reports()).getAllByText('render (boundary)')).toHaveLength(2);

    await user.click(demo.getByRole('button', { name: 'Fix data and retry' }));
    expect(demo.getByText('Grace Hopper')).toBeInTheDocument();
    expect(demo.getByLabelText('Server returns malformed profile data')).not.toBeChecked();
  });

  it('clears the boundary when a reset key changes', async () => {
    quietReactErrors();
    const user = userEvent.setup();
    render(<ErrorRecoveryLab retryBaseDelayMs={10} />);
    const demo = panel(/1\. Render error/);
    await user.click(demo.getByLabelText('Server returns malformed profile data'));
    await user.click(demo.getByLabelText('Server returns malformed profile data'));
    expect(demo.getByRole('alert')).toBeInTheDocument();
    await user.selectOptions(demo.getByLabelText('Account (a reset key)'), 'ada');
    expect(demo.queryByRole('alert')).not.toBeInTheDocument();
    expect(demo.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('surfaces event handler errors through state', async () => {
    const user = userEvent.setup();
    render(<ErrorRecoveryLab retryBaseDelayMs={10} />);
    const demo = panel(/2\. Event handler error/);
    await user.click(demo.getByRole('button', { name: 'Save settings' }));
    expect(demo.getByRole('alert')).toHaveTextContent('Display name must not be empty');
    expect(demo.getByLabelText('Display name')).toHaveAttribute('aria-invalid', 'true');
    expect(reports()).toHaveTextContent('event handler');
    await user.type(demo.getByLabelText('Display name'), 'Grace');
    await user.click(demo.getByRole('button', { name: 'Save settings' }));
    expect(demo.getByText('Saved.')).toBeInTheDocument();
    expect(demo.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('handles an async effect error inline, or escalates it to the boundary', async () => {
    quietReactErrors();
    const user = userEvent.setup();
    render(<ErrorRecoveryLab retryBaseDelayMs={10} />);
    const demo = panel(/3\. Async error/);
    expect(await demo.findByText(/Product:/)).toBeInTheDocument();
    await user.selectOptions(demo.getByLabelText('Product'), '999');
    expect(await demo.findByRole('alert')).toHaveTextContent(
      'Could not load product 999: HTTP 404: Product not found',
    );
    await waitFor(() => expect(reports()).toHaveTextContent('effect'));
    expect(within(reports()).getAllByText('effect')).toHaveLength(1);

    await user.click(demo.getByLabelText(/Escalate to the error boundary/));
    expect(await demo.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(demo.getByRole('alert')).toHaveTextContent('Something went wrong.');
  });

  it('retries a flaky request with backoff until it succeeds', async () => {
    const user = userEvent.setup();
    render(<ErrorRecoveryLab retryBaseDelayMs={10} />);
    const demo = panel(/4\. Retry/);
    await user.click(demo.getByRole('button', { name: 'Load report' }));
    await waitFor(() => expect(demo.getByText('Succeeded on attempt 3')).toBeInTheDocument());
    expect(within(reports()).getAllByText('retry')).toHaveLength(2);
    expect(reports()).toHaveTextContent('Attempt 1 failed (HTTP 503: Attempt 1 failed)');
  });

  it('gives up when attempts run out, and can be cancelled while waiting', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ErrorRecoveryLab retryBaseDelayMs={10} />);
    const demo = panel(/4\. Retry/);
    await user.selectOptions(demo.getByLabelText('Server failures before success'), '4');
    await user.selectOptions(demo.getByLabelText('Max attempts'), '2');
    await user.click(demo.getByRole('button', { name: 'Load report' }));
    expect(await demo.findByText('Gave up after 2 attempts.')).toBeInTheDocument();
    unmount();

    render(<ErrorRecoveryLab retryBaseDelayMs={5_000} />);
    const slow = panel(/4\. Retry/);
    await user.click(slow.getByRole('button', { name: 'Load report' }));
    await waitFor(() => expect(slow.getByText('waiting')).toBeInTheDocument());
    await user.click(slow.getByRole('button', { name: 'Cancel' }));
    expect(slow.getByText('idle')).toBeInTheDocument();
  });
});

describe('ErrorRecoveryScenario', () => {
  it('renders the lab with an explanation', () => {
    render(<ErrorRecoveryScenario />);
    expect(screen.getByText('Where errors can come from')).toBeInTheDocument();
    expect(screen.getByText('No errors reported.')).toBeInTheDocument();
  });
});
