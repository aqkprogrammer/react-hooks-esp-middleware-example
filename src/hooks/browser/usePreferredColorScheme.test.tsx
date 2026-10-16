import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../test/browserMocks';
import { usePreferredColorScheme } from './usePreferredColorScheme';
import { useReducedMotion } from './useReducedMotion';

const DARK = '(prefers-color-scheme: dark)';
const LIGHT = '(prefers-color-scheme: light)';
const REDUCE = '(prefers-reduced-motion: reduce)';

describe('usePreferredColorScheme', () => {
  it('reports light/dark and follows changes', () => {
    const media = installMatchMedia({ [DARK]: false, [LIGHT]: true });
    const { result } = renderHook(() => usePreferredColorScheme());
    expect(result.current).toBe('light');
    media.setMatches(LIGHT, false);
    media.setMatches(DARK, true);
    expect(result.current).toBe('dark');
  });

  it("returns 'no-preference' when unknown (no matchMedia)", () => {
    const { result } = renderHook(() => usePreferredColorScheme());
    expect(result.current).toBe('no-preference');
  });
});

describe('useReducedMotion', () => {
  it('follows prefers-reduced-motion', () => {
    const media = installMatchMedia({ [REDUCE]: false });
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
    media.setMatches(REDUCE, true);
    expect(result.current).toBe(true);
  });

  it('uses the default value without matchMedia', () => {
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
    expect(renderHook(() => useReducedMotion({ defaultValue: true })).result.current).toBe(true);
  });
});
