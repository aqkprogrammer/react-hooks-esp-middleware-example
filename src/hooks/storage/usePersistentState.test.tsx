import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetStorageAvailability } from './storageState';
import {
  createMemoryAdapter,
  usePersistentState,
  webStorageAdapter,
  type PersistenceAdapter,
} from './usePersistentState';

interface PrefsV1 {
  theme: string;
}
interface Prefs {
  theme: 'light' | 'dark';
  fontSize: number;
}

const isPrefs = (value: unknown): value is Prefs =>
  typeof value === 'object' &&
  value !== null &&
  ((value as Prefs).theme === 'light' || (value as Prefs).theme === 'dark') &&
  typeof (value as Prefs).fontSize === 'number';

const migrate = (old: unknown, from: number): unknown => {
  // v0: a bare string theme written by an older release.
  const v1: PrefsV1 = from === 0 ? { theme: String(old) } : (old as PrefsV1);
  return { theme: v1.theme === 'dark' ? 'dark' : 'light', fontSize: 14 };
};

const DEFAULTS: Prefs = { theme: 'light', fontSize: 16 };

afterEach(() => resetStorageAvailability());

describe('usePersistentState', () => {
  it('stores values in a versioned envelope through the adapter', () => {
    const adapter = createMemoryAdapter();
    const { result } = renderHook(() =>
      usePersistentState('prefs', DEFAULTS, { adapter, version: 2 }),
    );
    expect(result.current[0]).toEqual(DEFAULTS);
    act(() => result.current[1]((previous) => ({ ...previous, theme: 'dark' })));
    expect(result.current[0].theme).toBe('dark');
    expect(JSON.parse(adapter.getItem('prefs') ?? '')).toEqual({
      __v: 2,
      value: { theme: 'dark', fontSize: 16 },
    });
  });

  it('migrates older data once and writes the upgrade back', () => {
    const adapter = createMemoryAdapter();
    adapter.setItem('prefs', JSON.stringify({ __v: 1, value: { theme: 'dark' } }));
    const spy = vi.fn(migrate);
    const { result } = renderHook(() =>
      usePersistentState('prefs', DEFAULTS, {
        adapter,
        version: 2,
        migrate: spy,
        validate: isPrefs,
      }),
    );
    expect(result.current[0]).toEqual({ theme: 'dark', fontSize: 14 });
    expect(spy).toHaveBeenCalledWith({ theme: 'dark' }, 1);
    expect(JSON.parse(adapter.getItem('prefs') ?? '')).toEqual({
      __v: 2,
      value: { theme: 'dark', fontSize: 14 },
    });
  });

  it('treats non-enveloped legacy data as version 0', () => {
    const adapter = createMemoryAdapter();
    adapter.setItem('prefs', 'dark'); // not even JSON
    const { result } = renderHook(() =>
      usePersistentState('prefs', DEFAULTS, { adapter, version: 2, migrate, validate: isPrefs }),
    );
    expect(result.current[0]).toEqual({ theme: 'dark', fontSize: 14 });
  });

  it('ignores data from a newer version and reports it', () => {
    const adapter = createMemoryAdapter();
    adapter.setItem('prefs', JSON.stringify({ __v: 9, value: { future: true } }));
    const onError = vi.fn();
    const { result } = renderHook(() =>
      usePersistentState('prefs', DEFAULTS, { adapter, version: 2, migrate, onError }),
    );
    expect(result.current[0]).toEqual(DEFAULTS);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'version' }));
    // Not overwritten until the user changes something.
    expect(adapter.getItem('prefs')).toContain('"__v":9');
  });

  it('reports a throwing migration and invalid data', () => {
    const adapter = createMemoryAdapter();
    adapter.setItem('a', JSON.stringify({ __v: 1, value: 1 }));
    adapter.setItem('b', JSON.stringify({ __v: 2, value: { theme: 'blue' } }));
    const onError = vi.fn();
    const failing = () => {
      throw new Error('cannot upgrade');
    };
    renderHook(() =>
      usePersistentState('a', DEFAULTS, { adapter, version: 2, migrate: failing, onError }),
    );
    renderHook(() =>
      usePersistentState('b', DEFAULTS, { adapter, version: 2, validate: isPrefs, onError }),
    );
    expect(onError.mock.calls.map(([error]) => error.kind)).toEqual(['migrate', 'invalid']);
  });

  it('reports write and serialisation errors and keeps the previous value', () => {
    const failing: PersistenceAdapter = {
      ...createMemoryAdapter(),
      setItem: () => {
        throw new DOMException('Full', 'QuotaExceededError');
      },
    };
    const onError = vi.fn();
    const { result } = renderHook(() =>
      usePersistentState<unknown>('k', 'initial', { adapter: failing, onError }),
    );
    act(() => result.current[1]('next'));
    expect(result.current[0]).toBe('initial');
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'write' }));

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const ok = renderHook(() =>
      usePersistentState<unknown>('c', 'initial', { adapter: createMemoryAdapter(), onError }),
    );
    act(() => ok.result.current[1](cyclic));
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'serialize' }));
  });

  it('syncs hooks sharing an adapter and key; remove() resets', () => {
    const adapter = createMemoryAdapter();
    const a = renderHook(() => usePersistentState('n', 0, { adapter }));
    const b = renderHook(() => usePersistentState('n', 0, { adapter }));
    act(() => a.result.current[1](5));
    expect(b.result.current[0]).toBe(5);
    act(() => b.result.current[2]());
    expect(a.result.current[0]).toBe(0);
  });

  it('webStorageAdapter persists to localStorage and follows other tabs', () => {
    const adapter = webStorageAdapter('local');
    expect(webStorageAdapter('local')).toBe(adapter);
    const { result } = renderHook(() => usePersistentState('count', 0, { adapter }));
    act(() => result.current[1](1));
    expect(window.localStorage.getItem('count')).toBe('{"__v":1,"value":1}');
    act(() => {
      window.localStorage.setItem('count', '{"__v":1,"value":7}');
      window.dispatchEvent(new StorageEvent('storage', { key: 'count' }));
    });
    expect(result.current[0]).toBe(7);
  });
});
