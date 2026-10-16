import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DebounceVsThrottleDemo from './DebounceVsThrottleDemo';

const count = (label: string) => screen.getByLabelText(`${label} count`).textContent;

describe('DebounceVsThrottleDemo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plots raw, debounced and throttled calls for the same events', () => {
    render(<DebounceVsThrottleDemo />);
    const input = screen.getByLabelText('…or type here');
    for (let i = 1; i <= 10; i += 1) {
      fireEvent.change(input, { target: { value: 'x'.repeat(i) } });
      act(() => vi.advanceTimersByTime(100));
    }
    expect(count('Raw events')).toBe('10');
    expect(count('Debounced')).toBe('0');
    // 1 s of events with a 250 ms interval: leading call + ~1 per interval.
    expect(Number(count('Throttled'))).toBeGreaterThanOrEqual(4);

    act(() => vi.advanceTimersByTime(250));
    expect(count('Debounced')).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: 'Clear timeline' }));
    expect(count('Raw events')).toBe('0');
  });
});
