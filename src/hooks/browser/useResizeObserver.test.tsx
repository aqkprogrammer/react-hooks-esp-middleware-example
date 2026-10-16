import { render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { installResizeObserver } from '../../test/browserMocks';
import { useResizeObserver, type UseResizeObserverOptions } from './useResizeObserver';

function Box({
  onResize,
  options,
}: {
  onResize: (entry: ResizeObserverEntry) => void;
  options?: UseResizeObserverOptions;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { isSupported } = useResizeObserver(ref, onResize, options);
  return (
    <div ref={ref} data-testid="box">
      supported:{String(isSupported)}
    </div>
  );
}

describe('useResizeObserver', () => {
  it('observes a ref target with the requested box and calls the latest callback', () => {
    const Observer = installResizeObserver();
    const observe = vi.spyOn(Observer.prototype, 'observe');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Box onResize={first} options={{ box: 'border-box' }} />);
    const box = screen.getByTestId('box');
    expect(box).toHaveTextContent('supported:true');
    expect(observe).toHaveBeenCalledWith(box, { box: 'border-box' });

    rerender(<Box onResize={second} options={{ box: 'border-box' }} />);
    Observer.resizeAll(box, 120, 40);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(expect.objectContaining({ target: box }));
    expect(Observer.instances).toHaveLength(1);
  });

  it('re-observes when the box changes and disconnects on unmount', () => {
    const Observer = installResizeObserver();
    const { rerender, unmount } = render(<Box onResize={vi.fn()} />);
    rerender(<Box onResize={vi.fn()} options={{ box: 'border-box' }} />);
    expect(Observer.instances).toHaveLength(2);
    expect(Observer.instances[0]?.disconnected).toBe(true);
    unmount();
    expect(Observer.instances[1]?.disconnected).toBe(true);
  });

  it('does nothing for a null target or when disabled', () => {
    const Observer = installResizeObserver();
    renderHook(() => useResizeObserver(null, vi.fn()));
    const element = document.createElement('div');
    renderHook(() => useResizeObserver(element, vi.fn(), { enabled: false }));
    expect(Observer.instances).toHaveLength(0);
  });

  it('reports isSupported false without ResizeObserver', () => {
    const onResize = vi.fn();
    render(<Box onResize={onResize} />);
    expect(screen.getByTestId('box')).toHaveTextContent('supported:false');
  });
});
