/**
 * Pure geometry and messages for the sortable list. No React, no DOM: the
 * component measures rectangles once at drag start and passes numbers in.
 */

/** Returns a new array with the item at `from` moved to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const [moved] = next.splice(from, 1) as [T];
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
  return next;
}

/**
 * Final index of the dragged item: the number of *other* items whose
 * vertical midpoint (measured at drag start) lies above the dragged item's
 * current centre.
 */
export function computeDropIndex(
  midpoints: readonly number[],
  from: number,
  center: number,
): number {
  let index = 0;
  midpoints.forEach((midpoint, i) => {
    if (i !== from && midpoint < center) index += 1;
  });
  return index;
}

/** How far a non-dragged item at `index` must move to open a gap at `to`. */
export function shiftFor(index: number, from: number, to: number, distance: number): number {
  if (index === from) return 0;
  if (to > from && index > from && index <= to) return -distance;
  if (to < from && index >= to && index < from) return distance;
  return 0;
}

/**
 * Screen-reader messages, modelled on the WAI-ARIA APG and react-aria
 * drag-and-drop announcements: what was picked up, where it is now, what to do next.
 */
export const announcements = {
  grabbed: (title: string, position: number, total: number) =>
    `Grabbed ${title}. Current position ${position} of ${total}. Press Up or Down Arrow to move, Space to drop, Escape to cancel.`,
  moved: (title: string, position: number, total: number) =>
    `${title} moved to position ${position} of ${total}.`,
  edge: (title: string, edge: 'top' | 'bottom') =>
    `${title} is already at the ${edge} of the list.`,
  dropped: (title: string, position: number, total: number) =>
    `Dropped ${title}. Final position ${position} of ${total}.`,
  canceled: (title: string, position: number, total: number) =>
    `Reorder cancelled. ${title} returned to position ${position} of ${total}.`,
};
