import { act, render, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { server } from '../../test/server';
import { resetStorageAvailability } from '../storage/storageState';
import { FeatureFlagProvider } from './FeatureFlagProvider';
import { defineFeatureFlags, pickKnownFlags } from './featureFlags';
import { useFeatureFlag, useFeatureFlags } from './useFeatureFlag';

const flags = defineFeatureFlags(
  { newCheckout: false, searchMode: 'exact', maxUploadMb: 10 },
  { storageKey: 'test:flags' },
);

const loadFlags = async (signal: AbortSignal) => {
  const response = await fetch('/api/feature-flags?delay=0', { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
};

function wrapper(load?: (signal: AbortSignal) => Promise<unknown>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <FeatureFlagProvider definition={flags} load={load}>
        {children}
      </FeatureFlagProvider>
    );
  };
}

afterEach(() => resetStorageAvailability());

describe('pickKnownFlags', () => {
  it('drops unknown names and wrongly typed values', () => {
    expect(
      pickKnownFlags(flags.defaults, {
        newCheckout: 'yes',
        searchMode: 'fuzzy',
        unknown: true,
        maxUploadMb: 5,
      }),
    ).toEqual({ searchMode: 'fuzzy', maxUploadMb: 5 });
    expect(pickKnownFlags(flags.defaults, null)).toEqual({});
    expect(pickKnownFlags(flags.defaults, [1])).toEqual({});
  });
});

describe('useFeatureFlag', () => {
  it('is typed by the definition', () => {
    const { result } = renderHook(() => useFeatureFlag(flags, 'maxUploadMb'));
    expectTypeOf(result.current).toEqualTypeOf<number>();
  });

  it('returns defaults outside a provider', () => {
    const { result } = renderHook(() => useFeatureFlag(flags, 'newCheckout'));
    expect(result.current).toBe(false);
  });

  it('applies remote values from the API (via MSW) over defaults', async () => {
    const { result } = renderHook(() => useFeatureFlags(flags), { wrapper: wrapper(loadFlags) });
    expect(result.current.status).toBe('loading');
    expect(result.current.flags.newCheckout).toBe(false);

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.flags).toEqual({
      newCheckout: true,
      searchMode: 'fuzzy',
      maxUploadMb: 25,
    });
    expect(result.current.sourceOf('newCheckout')).toBe('remote');
  });

  it('keeps defaults and reports the error when the remote load fails', async () => {
    server.use(
      http.get('/api/feature-flags', () => HttpResponse.json({ message: 'down' }, { status: 503 })),
    );
    const { result } = renderHook(() => useFeatureFlags(flags), { wrapper: wrapper(loadFlags) });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('HTTP 503');
    expect(result.current.flags.newCheckout).toBe(false);
  });

  it('lets local overrides win and persists them to localStorage', async () => {
    const { result } = renderHook(
      () => ({ all: useFeatureFlags(flags), mode: useFeatureFlag(flags, 'searchMode') }),
      { wrapper: wrapper(loadFlags) },
    );
    await waitFor(() => expect(result.current.all.status).toBe('ready'));

    act(() => result.current.all.setOverride('searchMode', 'prefix'));
    expect(result.current.mode).toBe('prefix');
    expect(result.current.all.sourceOf('searchMode')).toBe('override');
    expect(JSON.parse(window.localStorage.getItem('test:flags') ?? '{}')).toEqual({
      searchMode: 'prefix',
    });

    act(() => result.current.all.clearOverride('searchMode'));
    expect(result.current.mode).toBe('fuzzy');

    act(() => result.current.all.setOverride('newCheckout', false));
    act(() => result.current.all.clearOverrides());
    expect(result.current.all.flags.newCheckout).toBe(true);
  });

  it('ignores tampered overrides in storage', () => {
    window.localStorage.setItem('test:flags', JSON.stringify({ newCheckout: 'definitely', x: 1 }));
    const { result } = renderHook(() => useFeatureFlags(flags), { wrapper: wrapper() });
    expect(result.current.overrides).toEqual({});
    expect(result.current.status).toBe('idle');
  });

  it('aborts the remote request on unmount', () => {
    let signal: AbortSignal | undefined;
    const load = vi.fn((s: AbortSignal) => {
      signal = s;
      return new Promise<unknown>(() => {});
    });
    const { unmount } = renderHook(() => useFeatureFlags(flags), { wrapper: wrapper(load) });
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('refresh() loads again', async () => {
    const load = vi.fn(async () => ({ maxUploadMb: 50 }));
    const { result } = renderHook(() => useFeatureFlags(flags), { wrapper: wrapper(load) });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.refresh());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('useFeatureFlags throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Panel() {
      useFeatureFlags(flags);
      return null;
    }
    expect(() => render(<Panel />)).toThrow(/inside <FeatureFlagProvider/);
  });
});
