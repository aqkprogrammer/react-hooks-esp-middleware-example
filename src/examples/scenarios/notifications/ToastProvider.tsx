import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  formatShortcut,
  isApplePlatform,
  useAnnouncer,
  useEscapeKey,
  useFocusWithin,
  useHover,
  useKeyboardShortcut,
  useLatest,
  usePageVisibility,
  useReducedMotion,
} from '../../../hooks';
import { ToastContext, type ToastApi, type ToastOptions, type ToastRecord } from './toastContext';
import { ToastItem } from './ToastItem';

export interface ToastProviderProps {
  children: ReactNode;
  /** Toasts shown at once; the rest wait in a queue (none are dropped). Default `3`. */
  maxVisible?: number;
  /** Auto-dismiss delay for non-error toasts, in ms. Default `5000`. */
  defaultDuration?: number;
  /** Shortcut that moves focus to the notifications. Default `alt+t`. */
  shortcut?: string;
}

const noopSubscribe = () => () => {};
const serverIsApple = () => false;

const spoken = (toast: ToastRecord) =>
  [toast.title, toast.description].filter(Boolean).join('. ') + '.';

/**
 * Owns the toast queue and renders the viewport. Screen readers hear each
 * toast through `useAnnouncer` (errors assertively, everything else
 * politely) — the visual stack itself is not a live region, so nothing is
 * read twice.
 */
export function ToastProvider({
  children,
  maxVisible = 3,
  defaultDuration = 5000,
  shortcut = 'alt+t',
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(0);
  const defaultsRef = useLatest(defaultDuration);

  const notify = useCallback(
    (options: ToastOptions) => {
      nextId.current += 1;
      const id = `toast-${nextId.current}`;
      const tone = options.tone ?? 'info';
      const duration =
        options.duration !== undefined
          ? options.duration
          : tone === 'error'
            ? null
            : defaultsRef.current;
      const record: ToastRecord = {
        id,
        title: options.title,
        description: options.description,
        tone,
        duration,
        action: options.action,
      };
      setToasts((previous) => [...previous, record]);
      return id;
    },
    [defaultsRef],
  );
  const dismiss = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);
  const dismissAll = useCallback(() => setToasts([]), []);
  const api = useMemo<ToastApi>(
    () => ({ notify, dismiss, dismissAll }),
    [notify, dismiss, dismissAll],
  );

  const visible = useMemo(() => toasts.slice(0, maxVisible), [toasts, maxVisible]);
  const queued = toasts.length - visible.length;

  // Pause every countdown while the user is reading or operating the stack.
  const [regionRef, focusWithin] = useFocusWithin<HTMLElement>();
  const [stackRef, hovered] = useHover<HTMLOListElement>();
  const pageVisible = usePageVisibility();
  const paused = hovered || focusWithin || !pageVisible;
  const reducedMotion = useReducedMotion();

  // Announce toasts as they become visible, batched per politeness so a
  // burst is not cut short (each announcement replaces the previous one).
  const { announce } = useAnnouncer();
  const announced = useRef(new Set<string>());
  useEffect(() => {
    const fresh = visible.filter((toast) => !announced.current.has(toast.id));
    if (fresh.length === 0) return;
    for (const toast of fresh) announced.current.add(toast.id);
    const urgent = fresh.filter((toast) => toast.tone === 'error');
    const calm = fresh.filter((toast) => toast.tone !== 'error');
    if (calm.length) announce(calm.map(spoken).join(' '), { politeness: 'polite' });
    if (urgent.length) announce(urgent.map(spoken).join(' '), { politeness: 'assertive' });
  }, [visible, announce]);

  const regionElement = useRef<HTMLElement | null>(null);
  const setRegion = useCallback(
    (node: HTMLElement | null) => {
      regionElement.current = node;
      regionRef(node);
    },
    [regionRef],
  );

  /** Dismiss, moving focus to a neighbour first if it was inside this toast. */
  const dismissFrom = useCallback(
    (id: string, element: HTMLElement | null) => {
      if (element?.contains(document.activeElement)) {
        const neighbour = element.nextElementSibling ?? element.previousElementSibling;
        const target = neighbour?.querySelector<HTMLElement>('.toast-close');
        (target ?? regionElement.current)?.focus();
      }
      dismiss(id);
    },
    [dismiss],
  );

  // Escape dismisses the focused toast (only while focus is in the stack).
  useEscapeKey(
    () => {
      const active = document.activeElement;
      const item =
        active instanceof Element ? active.closest<HTMLElement>('[data-toast-id]') : null;
      const id = item?.dataset.toastId;
      if (item && id) dismissFrom(id, item);
    },
    { enabled: focusWithin },
  );

  // Keyboard users need a way to reach toasts that appear far from focus.
  useKeyboardShortcut(shortcut, () => {
    const region = regionElement.current;
    const first = region?.querySelector<HTMLElement>('.toast-close');
    (first ?? region)?.focus();
  });
  const apple = useSyncExternalStore(noopSubscribe, isApplePlatform, serverIsApple);

  return (
    <ToastContext value={api}>
      {children}
      <section
        ref={setRegion}
        aria-label="Notifications"
        className="toast-viewport"
        data-motion={reducedMotion ? 'reduce' : 'full'}
        tabIndex={-1}
      >
        <p className="visually-hidden">
          Press {formatShortcut(shortcut, { apple })} to move here. Escape dismisses the focused
          notification.
        </p>
        <ol ref={stackRef} className="toast-stack">
          {visible.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              paused={paused}
              reducedMotion={reducedMotion}
              onDismiss={dismissFrom}
            />
          ))}
        </ol>
        {queued > 0 || visible.length > 1 ? (
          <div className="toast-footer">
            {queued > 0 ? <span>{queued} more waiting</span> : <span />}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                regionElement.current?.focus();
                dismissAll();
              }}
            >
              Dismiss all
            </button>
          </div>
        ) : null}
      </section>
    </ToastContext>
  );
}
