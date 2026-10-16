import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useClickOutside, type UseClickOutsideOptions } from './useClickOutside';

function Popover({
  onOutside,
  options,
}: {
  onOutside: (event: Event) => void;
  options?: UseClickOutsideOptions;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const portal = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useClickOutside([panel, portal], onOutside, { ignore: [toggle, '[data-keep-open]'], ...options });
  return (
    <div>
      <button type="button" ref={toggle}>
        Toggle
      </button>
      <div ref={panel}>
        <button type="button">Inside</button>
      </div>
      <div ref={portal}>
        <span>Portal content</span>
      </div>
      <p data-keep-open>
        <span>Ignored by selector</span>
      </p>
      <p>Outside</p>
    </div>
  );
}

describe('useClickOutside', () => {
  it('calls the handler only for presses outside all refs and ignored elements', () => {
    const onOutside = vi.fn();
    render(<Popover onOutside={onOutside} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Inside' }));
    fireEvent.pointerDown(screen.getByText('Portal content'));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Toggle' }));
    fireEvent.pointerDown(screen.getByText('Ignored by selector'));
    expect(onOutside).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('sees presses even when propagation is stopped (capture phase)', () => {
    const onOutside = vi.fn();
    render(<Popover onOutside={onOutside} />);
    const outside = screen.getByText('Outside');
    outside.addEventListener('pointerdown', (event) => event.stopPropagation());
    fireEvent.pointerDown(outside);
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('uses the latest handler without re-subscribing', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Popover onOutside={first} />);
    rerender(<Popover onOutside={second} />);
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(add.mock.calls.filter(([type]) => type === 'pointerdown')).toHaveLength(1);
  });

  it('supports custom events and can be disabled', () => {
    const onOutside = vi.fn();
    const { rerender } = render(
      <Popover onOutside={onOutside} options={{ events: ['mousedown', 'touchstart'] }} />,
    );
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(onOutside).not.toHaveBeenCalled();
    fireEvent.touchStart(screen.getByText('Outside'));
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(onOutside).toHaveBeenCalledTimes(2);

    rerender(<Popover onOutside={onOutside} options={{ enabled: false }} />);
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(onOutside).toHaveBeenCalledTimes(2);
  });

  it('falls back to mousedown + touchstart without Pointer Events', () => {
    vi.stubGlobal('PointerEvent', undefined);
    const onOutside = vi.fn();
    render(<Popover onOutside={onOutside} />);
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('ignores presses on nodes that are no longer in the document', () => {
    const onOutside = vi.fn();
    render(<Popover onOutside={onOutside} />);
    const detached = document.createElement('div');
    fireEvent.pointerDown(detached);
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('removes its listeners on unmount', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const onOutside = vi.fn();
    const { unmount } = render(<Popover onOutside={onOutside} />);
    unmount();
    fireEvent.pointerDown(document.body);
    expect(onOutside).not.toHaveBeenCalled();
    const added = add.mock.calls.filter(([type]) => type === 'pointerdown');
    const removed = remove.mock.calls.filter(([type]) => type === 'pointerdown');
    expect(removed).toHaveLength(added.length);
  });
});
