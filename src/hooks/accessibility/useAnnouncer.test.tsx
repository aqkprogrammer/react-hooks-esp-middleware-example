import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANNOUNCE_DELAY_MS, useAnnouncer } from './useAnnouncer';

const region = (politeness: 'polite' | 'assertive') =>
  document.querySelector<HTMLElement>(`[data-live-announcer="${politeness}"]`);

afterEach(() => vi.useRealTimers());

describe('useAnnouncer', () => {
  it('creates one shared polite and assertive region, removed with the last user', () => {
    const first = renderHook(() => useAnnouncer());
    const second = renderHook(() => useAnnouncer());
    expect(document.querySelectorAll('[data-live-announcer]')).toHaveLength(2);
    expect(region('polite')).toHaveAttribute('aria-live', 'polite');
    expect(region('polite')).toHaveAttribute('role', 'status');
    expect(region('assertive')).toHaveAttribute('aria-live', 'assertive');
    expect(region('assertive')).toHaveAttribute('aria-atomic', 'true');

    first.unmount();
    expect(document.querySelectorAll('[data-live-announcer]')).toHaveLength(2);
    second.unmount();
    expect(document.querySelectorAll('[data-live-announcer]')).toHaveLength(0);
  });

  it('fills the region after a short delay and clears it after the timeout', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnnouncer());
    act(() => result.current.announce('Saved', { clearAfterMs: 1000 }));
    // Already-present region, content changes afterwards → reliably announced.
    expect(region('polite')).toHaveTextContent('');
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(region('polite')).toHaveTextContent('Saved');
    act(() => vi.advanceTimersByTime(1000));
    expect(region('polite')).toHaveTextContent('');
  });

  it('re-announces identical messages and routes assertive messages separately', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAnnouncer());
    act(() => result.current.announce('3 results'));
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    act(() => result.current.announce('3 results'));
    expect(region('polite')).toHaveTextContent(''); // emptied first…
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(region('polite')).toHaveTextContent('3 results'); // …then refilled

    act(() => result.current.announce('Connection lost', { politeness: 'assertive' }));
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(region('assertive')).toHaveTextContent('Connection lost');
    expect(region('polite')).toHaveTextContent('3 results');

    act(() => result.current.clear());
    expect(region('assertive')).toHaveTextContent('');
    expect(region('polite')).toHaveTextContent('');
  });

  it('clears pending timers on unmount and ignores announcements afterwards', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useAnnouncer());
    act(() => result.current.announce('Pending'));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    result.current.announce('Too late');
    expect(document.querySelectorAll('[data-live-announcer]')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
