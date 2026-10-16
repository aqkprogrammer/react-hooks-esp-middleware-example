import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePointerPosition } from './usePointerPosition';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const nextFrame = () => act(() => vi.advanceTimersByTime(16));

describe('usePointerPosition', () => {
  it('returns null until the pointer moves, then window coordinates', () => {
    const { result } = renderHook(() => usePointerPosition());
    expect(result.current).toBeNull();

    fireEvent.pointerMove(window, { clientX: 10, clientY: 20, pointerType: 'mouse' });
    nextFrame();
    expect(result.current).toMatchObject({ clientX: 10, clientY: 20, x: 10, y: 20 });
  });

  it('commits at most one update per animation frame', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return usePointerPosition();
    });
    const before = renders;
    for (let index = 1; index <= 20; index += 1) {
      fireEvent.pointerMove(window, { clientX: index, clientY: index });
    }
    nextFrame();
    expect(renders - before).toBe(1);
    expect(result.current?.x).toBe(20);
  });

  it('reports coordinates relative to an element and resets on pointerleave', () => {
    function Tracker() {
      const ref = useRef<HTMLDivElement>(null);
      const position = usePointerPosition({ target: ref });
      return (
        <div ref={ref} data-testid="area">
          {position
            ? `${position.x},${position.y} ${position.ratioX.toFixed(2)},${position.ratioY.toFixed(2)}`
            : 'outside'}
        </div>
      );
    }
    render(<Tracker />);
    const area = screen.getByTestId('area');
    vi.spyOn(area, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 100, y: 50, width: 200, height: 100 }),
    );

    fireEvent.pointerMove(area, { clientX: 150, clientY: 75 });
    nextFrame();
    expect(area).toHaveTextContent('50,25 0.25,0.25');

    fireEvent.pointerLeave(area);
    expect(area).toHaveTextContent('outside');
  });

  it('stops listening when disabled and cancels a pending frame on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const { result, rerender, unmount } = renderHook(
      ({ enabled }) => usePointerPosition({ enabled }),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });
    expect(remove.mock.calls.some(([type]) => type === 'pointermove')).toBe(true);
    fireEvent.pointerMove(window, { clientX: 5, clientY: 5 });
    nextFrame();
    expect(result.current).toBeNull();

    rerender({ enabled: true });
    fireEvent.pointerMove(window, { clientX: 5, clientY: 5 });
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it('attaches to an element that mounts later once enabled', () => {
    function Toggle() {
      const ref = useRef<HTMLDivElement>(null);
      const [show, setShow] = useState(false);
      const position = usePointerPosition({ target: ref, enabled: show });
      return (
        <>
          <button type="button" onClick={() => setShow(true)}>
            show
          </button>
          {show ? (
            <div ref={ref} data-testid="late">
              {position ? `${position.x}` : 'none'}
            </div>
          ) : null}
        </>
      );
    }
    render(<Toggle />);
    fireEvent.click(screen.getByRole('button', { name: 'show' }));
    const late = screen.getByTestId('late');
    vi.spyOn(late, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 100 }),
    );
    fireEvent.pointerMove(late, { clientX: 30, clientY: 30 });
    nextFrame();
    expect(late).toHaveTextContent('30');
  });
});
