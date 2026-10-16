import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useHover, type UseHoverOptions } from './useHover';

function Card({ options }: { options?: UseHoverOptions }) {
  const [ref, isHovered] = useHover<HTMLDivElement>(options);
  return (
    <div ref={ref} data-testid="card">
      {isHovered ? 'hovered' : 'idle'}
    </div>
  );
}

describe('useHover', () => {
  it('tracks pointerenter and pointerleave', () => {
    const onChange = vi.fn();
    render(<Card options={{ onChange }} />);
    const card = screen.getByTestId('card');
    expect(card).toHaveTextContent('idle');
    fireEvent.pointerEnter(card, { pointerType: 'mouse' });
    expect(card).toHaveTextContent('hovered');
    fireEvent.pointerLeave(card, { pointerType: 'mouse' });
    expect(card).toHaveTextContent('idle');
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([true, false]);
  });

  it('ignores touch pointers by default, but can include them', () => {
    const { unmount } = render(<Card />);
    fireEvent.pointerEnter(screen.getByTestId('card'), { pointerType: 'touch' });
    expect(screen.getByTestId('card')).toHaveTextContent('idle');
    unmount();

    render(<Card options={{ ignoreTouch: false }} />);
    fireEvent.pointerEnter(screen.getByTestId('card'), { pointerType: 'touch' });
    expect(screen.getByTestId('card')).toHaveTextContent('hovered');
  });

  it('resets when the element is swapped', () => {
    function Swapper() {
      const [ref, isHovered] = useHover<HTMLElement>();
      const [useButton, setUseButton] = useState(false);
      return (
        <>
          <p>{isHovered ? 'hovered' : 'idle'}</p>
          {useButton ? (
            <button key="second" type="button" ref={ref}>
              Second
            </button>
          ) : (
            <button key="first" type="button" ref={ref} onClick={() => setUseButton(true)}>
              First
            </button>
          )}
        </>
      );
    }
    render(<Swapper />);
    const first = screen.getByRole('button', { name: 'First' });
    fireEvent.pointerEnter(first);
    expect(screen.getByText('hovered')).toBeInTheDocument();
    fireEvent.click(first);
    expect(screen.getByText('idle')).toBeInTheDocument();
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Second' }));
    expect(screen.getByText('hovered')).toBeInTheDocument();
  });

  it('removes its listeners on unmount', () => {
    const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
    const { unmount } = render(<Card />);
    unmount();
    const types = remove.mock.calls.map(([type]) => type);
    expect(types).toEqual(expect.arrayContaining(['pointerenter', 'pointerleave']));
  });
});
