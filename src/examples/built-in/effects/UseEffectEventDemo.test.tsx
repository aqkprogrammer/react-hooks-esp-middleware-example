import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseEffectEventDemo from './UseEffectEventDemo';

const messages = (name: string) =>
  within(screen.getByRole('log', { name }))
    .getAllByRole('listitem')
    .map((item) => item.textContent?.replace(/^\S+ /, ''))
    .filter((text) => text !== 'Nothing logged yet.')
    .reverse();

const clearLogs = () =>
  screen.getAllByRole('button', { name: 'Clear log' }).forEach((button) => fireEvent.click(button));

describe('UseEffectEventDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('connects once and notifies with the current theme', () => {
    render(<UseEffectEventDemo />);
    act(() => vi.advanceTimersByTime(500));
    expect(messages('Effect Event log')).toEqual([
      'connect #general',
      '🔔 Connected to #general (light toast)',
    ]);
  });

  it('changing the theme reconnects only the naive room', () => {
    render(<UseEffectEventDemo />);
    act(() => vi.advanceTimersByTime(500));
    clearLogs();

    fireEvent.click(screen.getByRole('checkbox', { name: /Dark notifications/ }));
    act(() => vi.advanceTimersByTime(500));

    expect(messages('Naive log')).toEqual([
      'disconnect #general',
      'connect #general',
      '🔔 Connected to #general (dark toast)',
    ]);
    expect(
      within(screen.getByRole('log', { name: 'Effect Event log' })).getByText(
        'Nothing logged yet.',
      ),
    ).toBeInTheDocument();
  });

  it('a room change reconnects and the Effect Event reads the latest theme', () => {
    render(<UseEffectEventDemo />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Dark notifications/ }));
    act(() => vi.advanceTimersByTime(500));
    clearLogs();

    fireEvent.click(screen.getByRole('button', { name: '#music' }));
    // Theme flips while the connection is pending: the Effect Event sees the new value.
    fireEvent.click(screen.getByRole('checkbox', { name: /Dark notifications/ }));
    act(() => vi.advanceTimersByTime(500));

    expect(messages('Effect Event log')).toEqual([
      'disconnect #general',
      'connect #music',
      '🔔 Connected to #music (light toast)',
    ]);
  });

  it('disconnects pending connections on unmount', () => {
    const { unmount } = render(<UseEffectEventDemo />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
