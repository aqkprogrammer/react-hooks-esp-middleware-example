import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCrossTabState } from './useCrossTabState';

// Each renderHook stands in for a tab; Node's BroadcastChannel connects them.
describe('useCrossTabState', () => {
  it('broadcasts updates to the other tabs without touching storage', async () => {
    const a = renderHook(() => useCrossTabState('test:slide', 0));
    const b = renderHook(() => useCrossTabState('test:slide', 0));
    act(() => a.result.current[1]((slide) => slide + 1));
    expect(a.result.current[0]).toBe(1);
    await waitFor(() => expect(b.result.current[0]).toBe(1));
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    a.unmount();
    b.unmount();
  });

  it('a newly opened tab receives the current value from open tabs', async () => {
    const first = renderHook(() => useCrossTabState('test:late', 'initial'));
    act(() => first.result.current[1]('shared'));
    const late = renderHook(() => useCrossTabState('test:late', 'initial'));
    expect(late.result.current[0]).toBe('initial');
    await waitFor(() => expect(late.result.current[0]).toBe('shared'));
    first.unmount();
    late.unmount();
  });

  it('structured-clones values such as Map and Date', async () => {
    const a = renderHook(() => useCrossTabState('test:clone', new Map<string, Date>()));
    const b = renderHook(() => useCrossTabState('test:clone', new Map<string, Date>()));
    const when = new Date(Date.UTC(2026, 0, 1));
    act(() => a.result.current[1](new Map([['launch', when]])));
    await waitFor(() => expect(b.result.current[0].get('launch')?.getTime()).toBe(when.getTime()));
    a.unmount();
    b.unmount();
  });

  it('converges with last-writer-wins and rejects invalid values', async () => {
    const isNumber = (value: unknown): value is number => typeof value === 'number';
    const onError = vi.fn();
    const a = renderHook(() => useCrossTabState('test:lww', 0, { validate: isNumber, onError }));
    const b = renderHook(() => useCrossTabState('test:lww', 0, { validate: isNumber, onError }));
    // Concurrent writes (same millisecond): ties break by tab id, so both tabs converge.
    act(() => a.result.current[1](1));
    act(() => b.result.current[1](2));
    await waitFor(() => expect(a.result.current[0]).toBe(b.result.current[0]));

    // A later write always wins.
    act(() => b.result.current[1](3));
    await waitFor(() => expect(a.result.current[0]).toBe(3));
    act(() => a.result.current[1](4));
    await waitFor(() => expect(b.result.current[0]).toBe(4));

    const raw = new BroadcastChannel('test:lww');
    raw.postMessage({
      type: 'set',
      value: 'not a number',
      stamp: { at: Date.now() + 1e6, tab: 'z' },
    });
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(a.result.current[0]).toBe(4);
    raw.close();
    a.unmount();
    b.unmount();
  });

  it('works like useState without BroadcastChannel', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const { result } = renderHook(() => useCrossTabState('test:none', () => 'lazy'));
    expect(result.current[0]).toBe('lazy');
    act(() => result.current[1]('local'));
    expect(result.current[0]).toBe('local');
  });
});
