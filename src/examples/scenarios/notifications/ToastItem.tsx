import { useEffect, useEffectEvent, useRef, type CSSProperties } from 'react';
import { TONE_LABEL, type ToastRecord } from './toastContext';

export interface ToastItemProps {
  toast: ToastRecord;
  /** Hovered, focused or the page is hidden: the countdown stops. */
  paused: boolean;
  reducedMotion: boolean;
  onDismiss: (id: string, element: HTMLElement | null) => void;
}

/**
 * One toast. The countdown only runs while the toast is visible and not
 * paused; pausing keeps the remaining time instead of restarting it
 * (WCAG 2.2.1 Timing Adjustable).
 */
export function ToastItem({ toast, paused, reducedMotion, onDismiss }: ToastItemProps) {
  const itemRef = useRef<HTMLLIElement>(null);
  const remainingRef = useRef(toast.duration ?? 0);
  const expire = useEffectEvent(() => onDismiss(toast.id, itemRef.current));

  useEffect(() => {
    if (paused || toast.duration === null) return;
    const startedAt = Date.now();
    const timer = setTimeout(expire, remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [paused, toast.duration]);

  const countdownStyle =
    toast.duration === null
      ? undefined
      : ({ '--toast-duration': `${toast.duration}ms` } as CSSProperties);

  return (
    <li
      ref={itemRef}
      className="toast"
      data-tone={toast.tone}
      data-toast-id={toast.id}
      data-paused={paused || undefined}
    >
      <div className="toast-body">
        <span className="toast-tone">{TONE_LABEL[toast.tone]}</span>
        <strong className="toast-title">{toast.title}</strong>
        {toast.description ? <p className="toast-description">{toast.description}</p> : null}
        {toast.action ? (
          <div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                toast.action?.onAction();
                onDismiss(toast.id, itemRef.current);
              }}
            >
              {toast.action.label}
            </button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-sm toast-close"
        aria-label={`Dismiss: ${toast.title}`}
        onClick={() => onDismiss(toast.id, itemRef.current)}
      >
        <span aria-hidden="true">×</span>
      </button>
      {/* A shrinking bar is motion: with reduced motion the countdown is not drawn. */}
      {toast.duration !== null && !reducedMotion ? (
        <span className="toast-countdown" style={countdownStyle} aria-hidden="true" />
      ) : null}
    </li>
  );
}
