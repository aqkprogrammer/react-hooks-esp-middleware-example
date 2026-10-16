import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DebounceVsDeferredDemo from './DebounceVsDeferredDemo';

const panel = (name: string) => within(screen.getByRole('region', { name }));

/** One synchronous change event per keystroke (fake timers + act, no user-event waits). */
function typeQuickly(text: string) {
  const input = screen.getByLabelText('Filter 1,500 people');
  for (let length = 1; length <= text.length; length += 1) {
    fireEvent.change(input, { target: { value: text.slice(0, length) } });
  }
}

describe('DebounceVsDeferredDemo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the deferred list right away and the debounced list after the pause', () => {
    // Keep performance.now real: the demo's artificial slowness busy-waits on it.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<DebounceVsDeferredDemo />);

    typeQuickly('ada');
    expect(panel('useDeferredValue').getByText('75 matches for “ada”')).toBeInTheDocument();
    expect(panel('Debounced (300 ms)').getByText('1500 matches for “”')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(299));
    expect(panel('Debounced (300 ms)').getByText('1500 matches for “”')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(panel('Debounced (300 ms)').getByText('75 matches for “ada”')).toBeInTheDocument();
  });

  it('renders the debounced list only once for a burst of keystrokes', () => {
    // Keep performance.now real: the demo's artificial slowness busy-waits on it.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<DebounceVsDeferredDemo />);

    typeQuickly('ada');
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText(/Debounced list commits:/)).toHaveTextContent(/commits: 2 /);
    expect(screen.getByText(/Deferred list commits:/)).toHaveTextContent(/commits: 4 /);
  });
});
