import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../test/browserMocks';
import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery', () => {
  it('returns the default value when matchMedia is unavailable', () => {
    // jsdom does not implement matchMedia, which mimics very old browsers.
    const { result } = renderHook(() =>
      useMediaQuery('(min-width: 600px)', { defaultValue: true }),
    );
    expect(result.current).toBe(true);
  });

  it('reads the current match and updates when it changes', () => {
    const media = installMatchMedia({ '(min-width: 600px)': false });
    const { result } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(result.current).toBe(false);

    media.setMatches('(min-width: 600px)', true);
    expect(result.current).toBe(true);
  });

  it('switches subscriptions when the query changes', () => {
    const media = installMatchMedia({ '(a)': true, '(b)': false });
    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(a)' },
    });
    expect(result.current).toBe(true);
    rerender({ query: '(b)' });
    expect(result.current).toBe(false);
    media.setMatches('(b)', true);
    expect(result.current).toBe(true);
  });
});
