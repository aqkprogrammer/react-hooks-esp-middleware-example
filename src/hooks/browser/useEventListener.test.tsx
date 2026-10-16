import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useEventListener } from './useEventListener';

describe('useEventListener', () => {
  it('listens on window by default and removes the listener on unmount', () => {
    const handler = vi.fn();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useEventListener('resize', handler));
    fireEvent(window, new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    fireEvent(window, new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);
    const added = add.mock.calls.filter(([type]) => type === 'resize');
    const removed = remove.mock.calls.filter(([type]) => type === 'resize');
    expect(removed).toHaveLength(added.length);
  });

  it('always calls the latest handler without re-subscribing', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ handler }) => useEventListener('click', handler, document), {
      initialProps: { handler: first },
    });
    rerender({ handler: second });
    fireEvent.click(document);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(add.mock.calls.filter(([type]) => type === 'click')).toHaveLength(1);
  });

  it('attaches to an element ref', () => {
    const handler = vi.fn();
    function Clickable() {
      const ref = useRef<HTMLButtonElement>(null);
      useEventListener('click', handler, ref);
      return (
        <button type="button" ref={ref}>
          Target
        </button>
      );
    }
    render(<Clickable />);
    fireEvent.click(screen.getByRole('button', { name: 'Target' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the target is null', () => {
    const handler = vi.fn();
    renderHook(() => useEventListener('click', handler, null));
    fireEvent.click(document);
    expect(handler).not.toHaveBeenCalled();
  });

  it('re-subscribes when the event type changes', () => {
    const handler = vi.fn();
    function Switcher() {
      const [type, setType] = useState<'keydown' | 'keyup'>('keydown');
      useEventListener(type, handler);
      return (
        <button type="button" onClick={() => setType('keyup')}>
          {type}
        </button>
      );
    }
    render(<Switcher />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(window, { key: 'a' });
    expect(handler).not.toHaveBeenCalled();
    fireEvent.keyUp(window, { key: 'a' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
