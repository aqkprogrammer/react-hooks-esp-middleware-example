import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { useLatest } from '../state/useLatest';

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';

export interface UseRovingTabIndexOptions {
  /** Number of items in the group. */
  count: number;
  /** Which arrow keys move focus. Default `'horizontal'` (toolbars, tabs). */
  orientation?: RovingOrientation;
  /** Wrap from the last item to the first and vice versa. Default `true`. */
  loop?: boolean;
  /** Item that is tabbable initially. Default `0`. */
  initialIndex?: number;
  /** Disabled items are skipped by the arrow keys, Home and End. */
  isDisabled?: (index: number) => boolean;
  /** Swaps Left/Right for right-to-left layouts. Default `'ltr'`. */
  dir?: 'ltr' | 'rtl';
  /** Called when the active item changes through the keyboard, focus or `setActiveIndex`. */
  onActiveChange?: (index: number) => void;
}

/** Spread onto each item: `<button {...getItemProps(index)}>`. */
export interface RovingItemProps {
  tabIndex: 0 | -1;
  ref: (element: HTMLElement | null) => (() => void) | undefined;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onFocus: () => void;
}

export interface UseRovingTabIndexResult {
  /** The item with `tabIndex=0`; `-1` when every item is disabled. */
  activeIndex: number;
  /** Make an item active; `{ focus: true }` also moves DOM focus to it. */
  setActiveIndex: (index: number, options?: { focus?: boolean }) => void;
  getItemProps: (index: number) => RovingItemProps;
}

const KEYS: Record<RovingOrientation, { previous: string[]; next: string[] }> = {
  horizontal: { previous: ['ArrowLeft'], next: ['ArrowRight'] },
  vertical: { previous: ['ArrowUp'], next: ['ArrowDown'] },
  both: { previous: ['ArrowLeft', 'ArrowUp'], next: ['ArrowRight', 'ArrowDown'] },
};

function swapHorizontal(keys: string[]): string[] {
  return keys.map((key) =>
    key === 'ArrowLeft' ? 'ArrowRight' : key === 'ArrowRight' ? 'ArrowLeft' : key,
  );
}

/**
 * WAI-ARIA "roving tabindex" for composite widgets (toolbars, tab lists,
 * listboxes, menus, radio-like groups): the group is **one** Tab stop; arrow
 * keys move focus between items, Home/End jump to the ends, disabled items
 * are skipped, and Tab leaves the group. When the user tabs back in, focus
 * returns to the last active item.
 *
 * Only the active item has `tabIndex=0`; the others have `-1`. If the active
 * item becomes disabled or is removed, the first enabled item takes over.
 *
 * You still provide the semantics (`role="toolbar"`, `role="tablist"` +
 * `aria-orientation`, labels); this hook only manages focus.
 */
export function useRovingTabIndex(options: UseRovingTabIndexOptions): UseRovingTabIndexResult {
  const { count, orientation = 'horizontal', loop = true, initialIndex = 0, dir = 'ltr' } = options;
  const isDisabled = options.isDisabled;
  const [storedIndex, setStoredIndex] = useState(initialIndex);
  const itemsRef = useRef(new Map<number, HTMLElement>());
  const onActiveChangeRef = useLatest(options.onActiveChange);

  const enabled = (index: number) => index >= 0 && index < count && !isDisabled?.(index);

  // Derived: fall back to the first enabled item when the stored one is gone.
  let activeIndex = -1;
  if (enabled(storedIndex)) activeIndex = storedIndex;
  else {
    for (let index = 0; index < count; index += 1) {
      if (enabled(index)) {
        activeIndex = index;
        break;
      }
    }
  }

  const setActiveIndex = useCallback(
    (index: number, { focus = false }: { focus?: boolean } = {}) => {
      setStoredIndex(index);
      onActiveChangeRef.current?.(index);
      if (focus) itemsRef.current.get(index)?.focus();
    },
    [onActiveChangeRef],
  );

  const findEnabled = (from: number, step: 1 | -1): number => {
    for (let offset = 1; offset <= count; offset += 1) {
      let index = from + step * offset;
      if (index < 0 || index >= count) {
        if (!loop) return -1;
        index = (index + count) % count;
      }
      if (enabled(index)) return index;
    }
    return -1;
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let { previous, next } = KEYS[orientation];
    if (dir === 'rtl') {
      previous = swapHorizontal(previous);
      next = swapHorizontal(next);
    }
    let target: number;
    if (next.includes(event.key)) target = findEnabled(index, 1);
    else if (previous.includes(event.key)) target = findEnabled(index, -1);
    else if (event.key === 'Home') target = findEnabled(-1, 1);
    else if (event.key === 'End') target = findEnabled(count, -1);
    else return;
    // Handled key: stop the page from scrolling even at the edges.
    event.preventDefault();
    if (target !== -1 && target !== index) setActiveIndex(target, { focus: true });
  };

  const getItemProps = (index: number): RovingItemProps => ({
    tabIndex: index === activeIndex ? 0 : -1,
    ref: (element) => {
      if (!element) return undefined;
      const items = itemsRef.current;
      items.set(index, element);
      return () => {
        if (items.get(index) === element) items.delete(index);
      };
    },
    onKeyDown: (event) => handleKeyDown(index, event),
    onFocus: () => {
      if (index !== activeIndex && enabled(index)) setActiveIndex(index);
    },
  });

  return { activeIndex, setActiveIndex, getItemProps };
}
