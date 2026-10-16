import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseIdleDemo from './UseIdleDemo';

describe('UseIdleDemo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts down, becomes idle and wakes up on activity', () => {
    render(<UseIdleDemo />);
    const state = screen.getByLabelText('Idle state');
    act(() => vi.advanceTimersByTime(2000));
    expect(state).toHaveTextContent('Idle in3 s');

    act(() => vi.advanceTimersByTime(3000));
    expect(state).toHaveTextContent('idle');
    expect(screen.getByRole('log')).toHaveTextContent('became idle');

    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
    });
    expect(state).toHaveTextContent('active');
    expect(screen.getByRole('log')).toHaveTextContent('active again');
  });

  it('uses the selected timeout', () => {
    render(<UseIdleDemo />);
    fireEvent.change(screen.getByLabelText('Idle after'), { target: { value: '10000' } });
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByLabelText('Idle state')).toHaveTextContent('active');
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByLabelText('Idle state')).toHaveTextContent('Statusidle');
  });
});
