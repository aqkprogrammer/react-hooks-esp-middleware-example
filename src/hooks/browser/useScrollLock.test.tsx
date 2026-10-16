import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { getScrollLockCount, useScrollLock } from './useScrollLock';

afterEach(() => {
  document.body.removeAttribute('style');
});

describe('useScrollLock', () => {
  it('locks body scroll and restores the previous inline styles', () => {
    document.body.style.overflow = 'scroll';
    document.body.style.paddingRight = '3px';
    const { rerender, unmount } = renderHook(({ locked }) => useScrollLock(locked), {
      initialProps: { locked: false },
    });
    expect(document.body.style.overflow).toBe('scroll');

    rerender({ locked: true });
    expect(document.body.style.overflow).toBe('hidden');

    rerender({ locked: false });
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.paddingRight).toBe('3px');
    unmount();
  });

  it('compensates the scrollbar gap with padding-right', () => {
    const restore = overrideProperty(
      document.documentElement,
      'clientWidth',
      window.innerWidth - 15,
    );
    document.body.style.paddingRight = '10px';
    const { unmount } = renderHook(() => useScrollLock());
    expect(document.body.style.paddingRight).toBe('25px');
    unmount();
    expect(document.body.style.paddingRight).toBe('10px');
    restore();
  });

  it('can skip the gap compensation', () => {
    const restore = overrideProperty(
      document.documentElement,
      'clientWidth',
      window.innerWidth - 15,
    );
    const { unmount } = renderHook(() => useScrollLock(true, { reserveScrollbarGap: false }));
    expect(document.body.style.paddingRight).toBe('');
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    restore();
  });

  it('reference-counts nested locks: only the last unlock restores', () => {
    const outer = renderHook(() => useScrollLock());
    const inner = renderHook(() => useScrollLock());
    expect(getScrollLockCount()).toBe(2);

    outer.unmount();
    expect(document.body.style.overflow).toBe('hidden');
    inner.unmount();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });
});
