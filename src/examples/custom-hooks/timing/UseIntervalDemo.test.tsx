import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseIntervalDemo from './UseIntervalDemo';

describe('UseIntervalDemo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks, reads the latest step and pauses', () => {
    render(<UseIntervalDemo />);
    const state = screen.getByLabelText('Ticker state');
    act(() => vi.advanceTimersByTime(3000));
    expect(state).toHaveTextContent('Count3');

    fireEvent.change(screen.getByLabelText('Step (read on each tick)'), {
      target: { value: '5' },
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(state).toHaveTextContent('Count8');

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByText('paused (delay = null)')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(state).toHaveTextContent('Count8');

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(state).toHaveTextContent('Count5');
    expect(state).toHaveTextContent('Ticks1');
  });
});
