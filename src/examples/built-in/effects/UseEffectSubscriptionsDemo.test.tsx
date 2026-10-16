import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UseEffectSubscriptionsDemo from './UseEffectSubscriptionsDemo';

describe('UseEffectSubscriptionsDemo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('attaches the pointer listener only while tracking and removes it afterwards', async () => {
    const user = userEvent.setup();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    render(<UseEffectSubscriptionsDemo />);

    await user.click(screen.getByRole('button', { name: 'Start tracking' }));
    const listener = add.mock.calls.find(([type]) => type === 'pointermove')?.[1];
    expect(listener).toBeDefined();

    fireEvent.pointerMove(window, { clientX: 10, clientY: 20 });
    expect(screen.getByText('10, 20')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Stop tracking' }));
    expect(remove).toHaveBeenCalledWith('pointermove', listener);
  });

  it('runs the stopwatch with an interval that is cleared on pause and unmount', async () => {
    // Fake only the interval APIs: React Testing Library's async helpers wait
    // on a real setTimeout, which would never fire under fully faked timers.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const user = userEvent.setup();
    const clear = vi.spyOn(window, 'clearInterval');
    const { unmount } = render(<UseEffectSubscriptionsDemo />);
    const elapsed = screen.getByLabelText('Elapsed time');

    await user.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(elapsed).toHaveTextContent('1.0 s');

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(clear).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(elapsed).toHaveTextContent('1.0 s');

    await user.click(screen.getByRole('button', { name: 'Start' }));
    act(() => vi.advanceTimersByTime(500));
    expect(elapsed).toHaveTextContent('1.5 s');

    unmount();
    expect(clear).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('syncs document.title and restores it', async () => {
    const user = userEvent.setup();
    document.title = 'Original';
    const { unmount } = render(<UseEffectSubscriptionsDemo />);

    await user.click(screen.getByRole('checkbox', { name: 'Sync the tab title' }));
    expect(document.title).toBe('Hooks Playground');

    const input = screen.getByLabelText('Tab title');
    await user.clear(input);
    expect(document.title).toBe('Untitled');
    await user.type(input, 'Hi');
    expect(document.title).toBe('Hi');

    await user.click(screen.getByRole('checkbox', { name: 'Sync the tab title' }));
    expect(document.title).toBe('Original');

    await user.click(screen.getByRole('checkbox', { name: 'Sync the tab title' }));
    unmount();
    expect(document.title).toBe('Original');
  });
});
