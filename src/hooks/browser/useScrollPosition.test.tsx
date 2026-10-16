import { act, render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { useScrollPosition } from './useScrollPosition';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const nextFrame = () => act(() => vi.advanceTimersToNextFrame());

describe('useScrollPosition', () => {
  it('tracks window scroll, at most once per animation frame', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useScrollPosition();
    });
    nextFrame();
    expect(result.current).toEqual({ x: 0, y: 0 });

    const restore = overrideProperty(window, 'scrollY', 250);
    const before = renders;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
    });
    expect(renders).toBe(before); // nothing until the frame
    nextFrame();
    expect(result.current).toEqual({ x: 0, y: 250 });
    expect(renders).toBe(before + 1);
    restore();
  });

  it('registers a passive listener and cleans up listener and frame on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useScrollPosition());
    expect(add).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('tracks a scrollable element through a ref', () => {
    function Scroller() {
      const ref = useRef<HTMLDivElement>(null);
      const { y } = useScrollPosition(ref);
      return (
        <div ref={ref} data-testid="scroller">
          y:{y}
        </div>
      );
    }
    render(<Scroller />);
    const scroller = screen.getByTestId('scroller');
    scroller.scrollTop = 120;
    act(() => {
      scroller.dispatchEvent(new Event('scroll'));
    });
    nextFrame();
    expect(scroller).toHaveTextContent('y:120');
  });

  it('does nothing for a null target', () => {
    const { result } = renderHook(() => useScrollPosition(null));
    nextFrame();
    expect(result.current).toEqual({ x: 0, y: 0 });
  });
});
