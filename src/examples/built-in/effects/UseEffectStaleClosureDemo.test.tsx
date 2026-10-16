import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseEffectStaleClosureDemo from './UseEffectStaleClosureDemo';

describe('UseEffectStaleClosureDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const tick = (seconds: number) => act(() => vi.advanceTimersByTime(seconds * 1000));

  it('the stale counter sticks at one step while the fresh one keeps counting', () => {
    render(<UseEffectStaleClosureDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Start stale counter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start fresh counter' }));
    tick(3);
    expect(screen.getByLabelText('Stale count')).toHaveTextContent('1');
    expect(screen.getByLabelText('Fresh count')).toHaveTextContent('3');
  });

  it('only the fresh counter picks up a new step', () => {
    render(<UseEffectStaleClosureDemo />);
    fireEvent.change(screen.getByLabelText('Stale step'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Fresh step'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start stale counter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start fresh counter' }));
    tick(1);
    fireEvent.change(screen.getByLabelText('Stale step'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Fresh step'), { target: { value: '10' } });
    tick(2);
    expect(screen.getByLabelText('Stale count')).toHaveTextContent('5');
    expect(screen.getByLabelText('Fresh count')).toHaveTextContent('25');
  });

  it('stops the intervals and resets', () => {
    const { unmount } = render(<UseEffectStaleClosureDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Start fresh counter' }));
    tick(2);
    fireEvent.click(screen.getByRole('button', { name: 'Stop fresh counter' }));
    tick(5);
    expect(screen.getByLabelText('Fresh count')).toHaveTextContent('2');
    fireEvent.click(screen.getByRole('button', { name: 'Reset fresh counter' }));
    expect(screen.getByLabelText('Fresh count')).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('button', { name: 'Start stale counter' }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
