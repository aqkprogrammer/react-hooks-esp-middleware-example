import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMatchMedia } from '../../../test/browserMocks';
import DragAndDropScenario from './DragAndDropScenario';
import { computeDropIndex, moveItem, shiftFor } from './reorder';

const ITEM_HEIGHT = 40;
const GAP = 10;

/** jsdom has no layout: give each sortable item a rectangle based on its position. */
function mockLayout() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const siblings = this.parentElement ? Array.from(this.parentElement.children) : [];
    const index = this.hasAttribute('data-sortable-item') ? siblings.indexOf(this) : 0;
    const top = index * (ITEM_HEIGHT + GAP);
    return {
      x: 0,
      y: top,
      top,
      bottom: top + ITEM_HEIGHT,
      left: 0,
      right: 300,
      width: 300,
      height: ITEM_HEIGHT,
      toJSON: () => ({}),
    } as DOMRect;
  });
}

const order = () =>
  within(screen.getByRole('list', { name: 'Release priorities' }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.sortable-title')?.textContent);

const politeRegion = () => document.querySelector('[data-live-announcer="polite"]');

beforeEach(() => mockLayout());
afterEach(() => vi.useRealTimers());

describe('reorder helpers', () => {
  it('moves items and computes drop indexes from midpoints', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    const midpoints = [20, 70, 120, 170];
    expect(computeDropIndex(midpoints, 0, 20)).toBe(0);
    expect(computeDropIndex(midpoints, 0, 125)).toBe(2);
    expect(computeDropIndex(midpoints, 3, 0)).toBe(0);
    expect(shiftFor(1, 0, 2, 50)).toBe(-50);
    expect(shiftFor(3, 0, 2, 50)).toBe(0);
    expect(shiftFor(1, 3, 0, 50)).toBe(50);
  });
});

describe('DragAndDropScenario', () => {
  it('reorders with a pointer drag and shifts neighbours while dragging', async () => {
    render(<DragAndDropScenario />);
    const handle = screen.getByRole('button', { name: 'Reorder Accessibility audit' });
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, isPrimary: true, clientY: 20 });
    // Move down past the midpoints of the next two items (70 and 120).
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 130 });
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveStyle({ transform: 'translateY(110px)' });
    expect(items[1]).toHaveStyle({ transform: 'translateY(-50px)' });
    expect(items[2]).toHaveStyle({ transform: 'translateY(-50px)' });
    // Moves from another pointer are ignored.
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: 400 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 130 });
    expect(order().slice(0, 3)).toEqual([
      'Search performance',
      'Offline mode',
      'Accessibility audit',
    ]);
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(
        'Dropped Accessibility audit. Final position 3 of 6.',
      ),
    );
  });

  it('cancels a pointer drag with Escape or pointercancel', () => {
    render(<DragAndDropScenario />);
    const before = order();
    const handle = screen.getByRole('button', { name: 'Reorder Offline mode' });
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, isPrimary: true, clientY: 120 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 0 });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 0 });
    expect(order()).toEqual(before);

    fireEvent.pointerDown(handle, { pointerId: 3, button: 0, isPrimary: true, clientY: 120 });
    fireEvent.pointerMove(handle, { pointerId: 3, clientY: 0 });
    fireEvent.pointerCancel(handle, { pointerId: 3 });
    expect(order()).toEqual(before);
    expect(screen.getAllByRole('listitem')[0]?.style.transform).toBe('');
  });

  it('ignores secondary buttons', () => {
    render(<DragAndDropScenario />);
    const before = order();
    const handle = screen.getByRole('button', { name: 'Reorder CSV export' });
    fireEvent.pointerDown(handle, { pointerId: 1, button: 2, isPrimary: true, clientY: 220 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 0 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 0 });
    expect(order()).toEqual(before);
  });

  it('reorders with the keyboard and announces every step', async () => {
    const user = userEvent.setup();
    render(<DragAndDropScenario />);
    const handle = screen.getByRole('button', { name: 'Reorder Search performance' });
    handle.focus();
    await user.keyboard(' ');
    expect(handle).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Grabbed Search performance.'));
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(order()[3]).toBe('Search performance');
    expect(handle).toHaveFocus();
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent('Search performance moved to position 4 of 6.'),
    );
    await user.keyboard(' ');
    expect(handle).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(
        'Dropped Search performance. Final position 4 of 6.',
      ),
    );
  });

  it('restores the original order on Escape and reports list edges', async () => {
    const user = userEvent.setup();
    render(<DragAndDropScenario />);
    const before = order();
    const handle = screen.getByRole('button', { name: 'Reorder Accessibility audit' });
    handle.focus();
    await user.keyboard('{Enter}{ArrowUp}');
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent('Accessibility audit is already at the top'),
    );
    await user.keyboard('{End}');
    expect(order().at(-1)).toBe('Accessibility audit');
    await user.keyboard('{Escape}');
    expect(order()).toEqual(before);
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(
        'Reorder cancelled. Accessibility audit returned to position 1 of 6.',
      ),
    );
  });

  it('offers single-click move buttons and a reset', async () => {
    const user = userEvent.setup();
    render(<DragAndDropScenario />);
    expect(screen.getByRole('button', { name: 'Move Accessibility audit up' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move Accessibility audit down' }));
    expect(order()[1]).toBe('Accessibility audit');
    await user.click(screen.getByRole('button', { name: 'Reset order' }));
    expect(order()[0]).toBe('Accessibility audit');
  });

  it('switches neighbour transitions off when reduced motion is requested', () => {
    installMatchMedia({ '(prefers-reduced-motion: reduce)': true });
    render(<DragAndDropScenario />);
    expect(screen.getByRole('list', { name: 'Release priorities' })).toHaveClass(
      'sortable-list-reduced-motion',
    );
    expect(screen.getByText('on')).toBeInTheDocument();
  });
});
