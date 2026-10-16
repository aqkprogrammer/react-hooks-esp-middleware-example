import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installMatchMedia, overrideProperty } from '../../test/browserMocks';
import { useOrientation } from './useOrientation';

class FakeScreenOrientation extends EventTarget {
  type: OrientationType = 'portrait-primary';
  angle = 0;
  rotate(type: OrientationType, angle: number) {
    this.type = type;
    this.angle = angle;
    act(() => {
      this.dispatchEvent(new Event('change'));
    });
  }
}

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
});

describe('useOrientation', () => {
  it('reports unsupported when neither API exists', () => {
    expect(window.matchMedia).toBeUndefined();
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toEqual({
      isSupported: false,
      source: 'none',
      type: null,
      angle: null,
      isPortrait: false,
      isLandscape: false,
    });
  });

  it('reads screen.orientation and follows change events', () => {
    const orientation = new FakeScreenOrientation();
    restore = overrideProperty(screen, 'orientation', orientation);
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toMatchObject({
      isSupported: true,
      source: 'screen-orientation',
      type: 'portrait-primary',
      angle: 0,
      isPortrait: true,
    });

    orientation.rotate('landscape-secondary', 270);
    expect(result.current).toMatchObject({
      type: 'landscape-secondary',
      angle: 270,
      isLandscape: true,
      isPortrait: false,
    });
  });

  it('removes the change listener on unmount', () => {
    const orientation = new FakeScreenOrientation();
    restore = overrideProperty(screen, 'orientation', orientation);
    const add = vi.spyOn(orientation, 'addEventListener');
    const remove = vi.spyOn(orientation, 'removeEventListener');
    const { unmount } = renderHook(() => useOrientation());
    unmount();
    expect(add).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(add.mock.calls.length);
  });

  it('falls back to the orientation media query without an angle', () => {
    const media = installMatchMedia({ '(orientation: portrait)': true });
    const { result } = renderHook(() => useOrientation());
    expect(result.current).toMatchObject({
      isSupported: true,
      source: 'media-query',
      type: 'portrait-primary',
      angle: null,
    });

    media.setMatches('(orientation: portrait)', false);
    expect(result.current.type).toBe('landscape-primary');
    expect(result.current.isLandscape).toBe(true);
  });
});
