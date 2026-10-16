import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { useLatest } from '../state/useLatest';

export interface UseDialogStateOptions {
  /** Open (modally) on mount. Default `false`. */
  defaultOpen?: boolean;
  /** Called after the dialog closed, for any reason, with its `returnValue`. */
  onClose?: (returnValue: string) => void;
  /** Allow Escape to close the dialog (the native `cancel` event). Default `true`. */
  closeOnEscape?: boolean;
  /** Close when the backdrop (outside the dialog box) is clicked. Default `false`. */
  closeOnBackdropClick?: boolean;
  /** Focus the element that opened the dialog after it closes. Default `true`. */
  restoreFocus?: boolean;
}

/** Spread onto the `<dialog>` element. */
export interface DialogProps {
  ref: RefObject<HTMLDialogElement | null>;
  'aria-labelledby': string;
  onClose: (event: SyntheticEvent<HTMLDialogElement>) => void;
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
  onClick: (event: MouseEvent<HTMLDialogElement>) => void;
}

export interface UseDialogStateResult {
  isOpen: boolean;
  /** Open modally with `showModal()` and remember the trigger for focus restoration. */
  open: () => void;
  /** Close with an optional `returnValue` (like `<form method="dialog">` buttons do). */
  close: (returnValue?: string) => void;
  /** `returnValue` from the most recent close. */
  returnValue: string | undefined;
  dialogProps: DialogProps;
  /** Give the dialog's heading this id — it labels the dialog. */
  titleId: string;
}

/**
 * State for a native `<dialog>` used as a modal. The element stays mounted;
 * `open()` calls `showModal()`, and `isOpen` follows the element's `close`
 * event, so closing via Escape, `<form method="dialog">` or `close()` all
 * keep React in sync.
 *
 * Why native `<dialog>` instead of a `<div role="dialog">`? `showModal()`
 * puts it in the top layer (no z-index wars), makes everything else inert
 * (so focus cannot leave and screen readers cannot wander), closes on Escape
 * and provides `::backdrop` — all things a div-based modal must re-implement
 * with focus traps, `aria-hidden` juggling and scroll locking.
 *
 * Focus restoration: browsers restore focus to the previously focused element
 * on close; this hook also does so explicitly (if focus was lost to `<body>`),
 * including when the component unmounts while open.
 */
export function useDialogState(options: UseDialogStateOptions = {}): UseDialogStateResult {
  const {
    defaultOpen = false,
    closeOnEscape = true,
    closeOnBackdropClick = false,
    restoreFocus = true,
  } = options;
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(defaultOpen);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [returnValue, setReturnValue] = useState<string | undefined>(undefined);
  const onCloseRef = useLatest(options.onClose);
  const restoreFocusRef = useLatest(restoreFocus);

  const restore = useCallback(
    (dialog: HTMLDialogElement | null) => {
      const trigger = triggerRef.current;
      triggerRef.current = null;
      if (!restoreFocusRef.current || !trigger?.isConnected) return;
      const current = document.activeElement;
      const lost = !current || current === document.body || (dialog?.contains(current) ?? false);
      if (lost) trigger.focus();
    },
    [restoreFocusRef],
  );

  const handleClosed = useCallback(
    (dialog: HTMLDialogElement) => {
      if (!openRef.current) return;
      openRef.current = false;
      const value = dialog.returnValue ?? '';
      setIsOpen(false);
      setReturnValue(value);
      restore(dialog);
      onCloseRef.current?.(value);
    },
    [restore, onCloseRef],
  );

  const show = (dialog: HTMLDialogElement) => {
    if (dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    // Very old browsers: fall back to a non-modal open dialog.
    else dialog.setAttribute('open', '');
  };

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || openRef.current) return;
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    openRef.current = true;
    show(dialog);
    setIsOpen(true);
  }, []);

  const close = useCallback(
    (value?: string) => {
      const dialog = dialogRef.current;
      if (!dialog || !openRef.current) return;
      if (typeof dialog.close === 'function') {
        // Fires the `close` event, which runs handleClosed.
        dialog.close(value);
      } else {
        if (value !== undefined) dialog.returnValue = value;
        dialog.removeAttribute('open');
        handleClosed(dialog);
      }
    },
    [handleClosed],
  );

  // `defaultOpen`: the element only exists after commit.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && openRef.current && !dialog.open) {
      const active = document.activeElement;
      triggerRef.current =
        active instanceof HTMLElement && active !== document.body ? active : null;
      show(dialog);
    }
    return () => {
      // Unmounting while open: the browser drops focus to <body>; put it back.
      if (openRef.current) restore(null);
    };
  }, [restore]);

  const onClose = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>) => handleClosed(event.currentTarget),
    [handleClosed],
  );

  const onCancel = useCallback(
    (event: SyntheticEvent<HTMLDialogElement>) => {
      if (!closeOnEscape) event.preventDefault();
    },
    [closeOnEscape],
  );

  const onClick = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      const dialog = event.currentTarget;
      // Clicks on ::backdrop target the <dialog> itself, but so do clicks on
      // its padding — compare with the box to tell them apart.
      if (!closeOnBackdropClick || event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) close();
    },
    [closeOnBackdropClick, close],
  );

  return {
    isOpen,
    open,
    close,
    returnValue,
    titleId,
    dialogProps: { ref: dialogRef, 'aria-labelledby': titleId, onClose, onCancel, onClick },
  };
}
