import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../../test/browserMocks';
import UseEventEmitterDemo from './UseEventEmitterDemo';
import UseExternalStoreDemo from './UseExternalStoreDemo';
import UseObservableDemo from './UseObservableDemo';
import UsePerformanceMeasureDemo from './UsePerformanceMeasureDemo';
import UsePermissionDemo from './UsePermissionDemo';
import UseSubscriptionDemo from './UseSubscriptionDemo';

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length) restores.pop()?.();
  vi.useRealTimers();
});

const commitCount = (label: string) => {
  const text = screen.getByText(`${label} commits:`, { exact: false }).textContent ?? '';
  return Number(/commits: (\d+)/.exec(text)?.[1]);
};

describe('UseEventEmitterDemo', () => {
  it('delivers events to every mounted subscriber only', async () => {
    const user = userEvent.setup();
    render(<UseEventEmitterDemo />);
    await user.click(screen.getByRole('button', { name: 'Add Keyboard ($89)' }));
    await user.click(screen.getByRole('button', { name: 'Add Mouse ($39)' }));
    expect(screen.getByText('$128')).toBeInTheDocument();
    expect(within(screen.getByRole('log')).getByText(/Mouse added/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unmount activity feed' }));
    await user.click(screen.getByRole('button', { name: 'Clear cart' }));
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('Activity feed unmounted.')).toBeInTheDocument();
  });
});

describe('UseSubscriptionDemo', () => {
  it('follows a class-based source and skips renders for equal snapshots', async () => {
    const user = userEvent.setup();
    render(<UseSubscriptionDemo />);
    const readout = screen.getByLabelText('Thermostat');
    const before = Number(/(-?\d+) °C/.exec(readout.textContent ?? '')?.[1]);

    await user.click(screen.getByRole('button', { name: 'Warmer' }));
    expect(readout).toHaveTextContent(`${before + 1} °C`);

    const commits = commitCount('Readout');
    await user.click(screen.getByRole('button', { name: 'Notify without a change' }));
    expect(commitCount('Readout')).toBe(commits);
  });

  it('reads the text selection', () => {
    render(<UseSubscriptionDemo />);
    restores.push(overrideProperty(document, 'getSelection', () => ({ toString: () => 'hooks' })));
    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });
    expect(screen.getByText('“hooks”')).toBeInTheDocument();
  });
});

describe('UseExternalStoreDemo', () => {
  it('re-renders only the components whose slice changed', async () => {
    const user = userEvent.setup();
    render(<UseExternalStoreDemo />);
    const theme = commitCount('ThemeSwitch');
    const user1 = commitCount('UserBadge');
    const list = commitCount('TodoList');

    await user.click(screen.getByRole('checkbox', { name: 'Write a selector' }));
    expect(commitCount('TodoList')).toBe(list + 1);
    expect(commitCount('ThemeSwitch')).toBe(theme);
    expect(commitCount('UserBadge')).toBe(user1);

    await user.click(screen.getByRole('button', { name: /Theme: light/ }));
    expect(screen.getByRole('button', { name: /Theme: dark/ })).toBeInTheDocument();
    expect(commitCount('TodoList')).toBe(list + 1);
  });
});

describe('UseObservableDemo', () => {
  it('renders BehaviorSubject state and debounced input', () => {
    vi.useFakeTimers();
    render(<UseObservableDemo />);
    const counter = screen.getByLabelText('Counter value');
    const start = Number(counter.textContent);
    fireEvent.click(screen.getByRole('button', { name: '+1' }));
    expect(counter).toHaveTextContent(String(start + 1));

    const search = screen.getByLabelText('Search');
    fireEvent.change(search, { target: { value: 'rx' } });
    fireEvent.change(search, { target: { value: 'rxjs' } });
    const debounced = screen.getByLabelText('Debounced value');
    expect(debounced).toHaveTextContent('—');
    act(() => vi.advanceTimersByTime(400));
    expect(debounced).toHaveTextContent('rxjs');
  });

  it('starts, errors and stops the ticker', () => {
    vi.useFakeTimers();
    render(<UseObservableDemo />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fail at tick 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start ticker' }));
    act(() => vi.advanceTimersByTime(1000));
    const ticker = screen.getByLabelText('Ticker');
    expect(ticker).toHaveTextContent('Tick2');
    act(() => vi.advanceTimersByTime(500));
    expect(ticker).toHaveTextContent('Tick 3 failed');
    fireEvent.click(screen.getByRole('button', { name: 'Stop ticker' }));
    expect(ticker).toHaveTextContent('waiting');
  });
});

describe('UsePermissionDemo', () => {
  it('shows an unsupported panel without the Permissions API', () => {
    render(<UsePermissionDemo />);
    expect(screen.getByText('Not supported in this browser')).toBeInTheDocument();
  });

  it('shows states, marks unknown names and never prompts on mount', async () => {
    const query = vi.fn(async ({ name }: { name: string }) => {
      if (name === 'clipboard-read') throw new TypeError('bad name');
      return Object.assign(new EventTarget(), { name, state: 'prompt' as PermissionState });
    });
    const getCurrentPosition = vi.fn();
    restores.push(overrideProperty(navigator, 'permissions', { query }));
    restores.push(overrideProperty(navigator, 'geolocation', { getCurrentPosition }));
    const user = userEvent.setup();
    render(<UsePermissionDemo />);
    await waitFor(() => expect(screen.getAllByText('prompt').length).toBeGreaterThan(0));
    expect(await screen.findByText('not queryable here')).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Request location' }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});

describe('UsePerformanceMeasureDemo', () => {
  it('records successful and failed measurements', async () => {
    vi.stubGlobal('PerformanceObserver', undefined);
    const user = userEvent.setup();
    render(<UsePerformanceMeasureDemo />);
    expect(screen.getByText('read back directly')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Measure a failure' }));
    expect(await screen.findByText('failing task')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Server latency'), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: 'Measure a request' }));
    expect(await screen.findByText('fetch /api/slow')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start manual span' }));
    await user.click(screen.getByRole('button', { name: 'Stop manual span' }));
    expect(screen.getByText('manual span')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('No measurements yet.')).toBeInTheDocument();
  });
});
