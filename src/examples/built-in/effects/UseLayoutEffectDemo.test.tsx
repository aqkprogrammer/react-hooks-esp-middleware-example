import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UseLayoutEffectDemo from './UseLayoutEffectDemo';

function rect(top: number, height: number, left = 0, width = 100): DOMRect {
  return {
    top,
    bottom: top + height,
    left,
    right: left + width,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

/** jsdom has no layout: give the stage, triggers and tooltip real-looking boxes. */
function fakeLayout() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.getAttribute('role') === 'tooltip') return rect(0, 40);
    if (this.classList.contains('use-layout-effect-demo-stage')) return rect(100, 200, 10);
    if (this.textContent === 'Hover or focus me (top)') return rect(104, 36, 14);
    if (this.textContent === 'Hover or focus me (bottom)') return rect(260, 36, 14);
    return rect(0, 0);
  });
}

const panel = (name: string) => within(screen.getByRole('region', { name }));

describe('UseLayoutEffectDemo', () => {
  beforeEach(fakeLayout);

  it.each(['useEffect (may flicker)', 'useLayoutEffect (no flicker)'])(
    '%s: measures the tooltip and places it above when there is room',
    (title) => {
      render(<UseLayoutEffectDemo />);
      const trigger = panel(title).getByRole('button', { name: 'Hover or focus me (bottom)' });
      fireEvent.focus(trigger);
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('Near the bottom: room above');
      expect(trigger).toHaveAccessibleDescription('Near the bottom: room above');
      expect(tooltip).toHaveAttribute('data-placement', 'above');
      // trigger top (260 - 100) - tooltip height 40 - gap 8
      expect(tooltip).toHaveStyle({ top: '112px', left: '4px' });
    },
  );

  it('flips below the trigger when there is no room above', () => {
    render(<UseLayoutEffectDemo />);
    const trigger = panel('useLayoutEffect (no flicker)').getByRole('button', {
      name: 'Hover or focus me (top)',
    });
    fireEvent.pointerEnter(trigger);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('data-placement', 'below');
    // trigger bottom (140 - 100) + gap 8
    expect(tooltip).toHaveStyle({ top: '48px' });

    fireEvent.pointerLeave(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('can block inside the effect to exaggerate the in-between frame', () => {
    render(<UseLayoutEffectDemo />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Exaggerate/ }));
    const now = vi.spyOn(performance, 'now');
    fireEvent.focus(
      panel('useEffect (may flicker)').getByRole('button', { name: 'Hover or focus me (bottom)' }),
    );
    expect(now).toHaveBeenCalled();
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-placement', 'above');
  });
});
