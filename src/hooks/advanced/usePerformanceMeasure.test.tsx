import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePerformanceMeasure } from './usePerformanceMeasure';

class FakePerformanceObserver {
  static instances: FakePerformanceObserver[] = [];
  static supportedEntryTypes = ['mark', 'measure'];
  observed: PerformanceObserverInit | null = null;
  disconnected = false;
  constructor(private readonly callback: PerformanceObserverCallback) {
    FakePerformanceObserver.instances.push(this);
  }
  observe(init: PerformanceObserverInit) {
    this.observed = init;
  }
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  /** Deliver entries, as the browser does asynchronously after `measure()`. */
  deliver(entries: PerformanceEntry[]) {
    const list = { getEntries: () => entries } as unknown as PerformanceObserverEntryList;
    act(() => this.callback(list, this as unknown as PerformanceObserver));
  }
}

afterEach(() => {
  FakePerformanceObserver.instances = [];
  vi.unstubAllGlobals();
  performance.clearMarks();
  performance.clearMeasures();
});

describe('usePerformanceMeasure without PerformanceObserver', () => {
  it('records manual spans and reads entries back directly', () => {
    vi.stubGlobal('PerformanceObserver', undefined);
    const { result } = renderHook(() => usePerformanceMeasure({ namespace: 'test' }));
    expect(result.current.isSupported).toBe(true);
    expect(result.current.usesObserver).toBe(false);

    let end: (status?: 'manual') => void = () => {};
    act(() => {
      end = result.current.start('load');
    });
    act(() => end());
    act(() => end()); // second call is ignored
    expect(result.current.measurements).toHaveLength(1);
    expect(result.current.measurements[0]).toMatchObject({
      name: 'test:load',
      label: 'load',
      status: 'manual',
    });
    expect(result.current.measurements[0]?.duration).toBeGreaterThanOrEqual(0);
  });

  it('measures async work, recording success and errors (and re-throwing)', async () => {
    vi.stubGlobal('PerformanceObserver', undefined);
    const { result } = renderHook(() => usePerformanceMeasure({ namespace: 'work' }));
    await act(async () => {
      await expect(result.current.measure('ok', async () => 42)).resolves.toBe(42);
    });
    await act(async () => {
      await expect(
        result.current.measure('bad', () => Promise.reject(new Error('nope'))),
      ).rejects.toThrow('nope');
    });
    expect(result.current.measurements.map((m) => [m.label, m.status])).toEqual([
      ['bad', 'error'],
      ['ok', 'success'],
    ]);
  });

  it('caps the list at maxEntries and clear() empties it', () => {
    vi.stubGlobal('PerformanceObserver', undefined);
    const { result } = renderHook(() => usePerformanceMeasure({ namespace: 'cap', maxEntries: 2 }));
    act(() => {
      for (let index = 0; index < 3; index += 1) result.current.start(`span${index}`)();
    });
    expect(result.current.measurements.map((m) => m.label)).toEqual(['span2', 'span1']);
    act(() => result.current.clear());
    expect(result.current.measurements).toEqual([]);
    expect(performance.getEntriesByName('cap:span2', 'measure')).toHaveLength(0);
  });
});

describe('usePerformanceMeasure with PerformanceObserver', () => {
  it('collects namespaced measures from the observer and disconnects on unmount', () => {
    vi.stubGlobal('PerformanceObserver', FakePerformanceObserver);
    const { result, unmount } = renderHook(() => usePerformanceMeasure({ namespace: 'obs' }));
    expect(result.current.usesObserver).toBe(true);
    const observer = FakePerformanceObserver.instances[0];
    expect(observer?.observed).toEqual({ type: 'measure' });

    // Ending a span does not record synchronously — the observer will.
    act(() => result.current.start('render-list')('manual'));
    expect(result.current.measurements).toHaveLength(0);

    const entries = performance.getEntriesByName('obs:render-list', 'measure');
    const foreign = { name: 'other:thing', entryType: 'measure', duration: 1, startTime: 0 };
    // A measure created outside React with the same prefix is collected too.
    const external = { name: 'obs:fetch', entryType: 'measure', duration: 12, startTime: 5 };
    observer?.deliver([...entries, foreign, external] as PerformanceEntry[]);
    expect(result.current.measurements.map((m) => m.label)).toEqual(['fetch', 'render-list']);

    unmount();
    expect(observer?.disconnected).toBe(true);
  });

  it('reports unsupported when User Timing is missing', () => {
    const now = performance.now.bind(performance);
    vi.stubGlobal('performance', { now });
    const { result } = renderHook(() => usePerformanceMeasure());
    expect(result.current.isSupported).toBe(false);
    const end = result.current.start('x');
    expect(() => end()).not.toThrow();
  });
});
