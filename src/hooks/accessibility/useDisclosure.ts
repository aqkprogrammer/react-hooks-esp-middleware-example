import { useCallback, useId, useState } from 'react';
import { useLatest } from '../state/useLatest';

export interface UseDisclosureOptions {
  /** Initial state when uncontrolled. Default `false`. */
  defaultOpen?: boolean;
  /** Controlled state. When set, the hook never changes it on its own — handle `onOpenChange`. */
  open?: boolean;
  /** Called with the requested state whenever open/close/toggle is invoked. */
  onOpenChange?: (open: boolean) => void;
  /** Base id; the panel gets `${id}-panel`. Defaults to `useId()`. */
  id?: string;
}

/** Spread onto the `<button>` that shows/hides the panel. */
export interface DisclosureTriggerProps {
  id: string;
  'aria-expanded': boolean;
  'aria-controls': string;
  onClick: () => void;
}

/** Spread onto the panel. `hidden` removes it from layout *and* the accessibility tree. */
export interface DisclosurePanelProps {
  id: string;
  hidden: boolean;
}

export interface UseDisclosureResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  triggerProps: DisclosureTriggerProps;
  panelProps: DisclosurePanelProps;
}

/**
 * Show/hide state for a WAI-ARIA disclosure (a button that toggles a panel):
 * "show more", accordion sections, collapsible filters, a mobile nav.
 *
 * Returns ARIA-wired props: the trigger gets `aria-expanded` and
 * `aria-controls` pointing at the panel's `useId`-generated id (stable across
 * server and client). The trigger must be a real `<button>` so Enter/Space
 * work natively. Works controlled (`open` + `onOpenChange`) or uncontrolled.
 *
 * For static content consider native `<details>/<summary>`, which needs no
 * JavaScript and supports find-in-page.
 */
export function useDisclosure(options: UseDisclosureOptions = {}): UseDisclosureResult {
  const generatedId = useId();
  const baseId = options.id ?? generatedId;
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(options.defaultOpen ?? false);
  const isControlled = options.open !== undefined;
  const isOpen = isControlled ? (options.open as boolean) : uncontrolledOpen;

  const isOpenRef = useLatest(isOpen);
  const isControlledRef = useLatest(isControlled);
  const onOpenChangeRef = useLatest(options.onOpenChange);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlledRef.current) setUncontrolledOpen(next);
      onOpenChangeRef.current?.(next);
    },
    [isControlledRef, onOpenChangeRef],
  );
  const open = useCallback(() => setOpen(true), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const toggle = useCallback(() => setOpen(!isOpenRef.current), [setOpen, isOpenRef]);

  return {
    isOpen,
    open,
    close,
    toggle,
    setOpen,
    triggerProps: {
      id: triggerId,
      'aria-expanded': isOpen,
      'aria-controls': panelId,
      onClick: toggle,
    },
    panelProps: { id: panelId, hidden: !isOpen },
  };
}
