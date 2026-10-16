import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button, Callout, EventLog, Panel, useEventLog } from '../../../components/ui';
import { useEventListener, useScrollLock } from '../../../hooks';
import './UseScrollLockDemo.css';

/**
 * Opening the overlay locks page scrolling; the nested confirmation adds a
 * second lock. Styles are restored only after the last overlay closes.
 */
export default function UseScrollLockDemo() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [gap, setGap] = useState(true);
  const { entries, log, clear } = useEventLog(20);

  const inspect = (label: string) => {
    const { overflow, paddingRight } = document.body.style;
    log(`${label}: body overflow="${overflow}" padding-right="${paddingRight}"`);
  };

  return (
    <div className="stack">
      <Panel
        title="Scroll-locking overlay"
        description="Open the overlay, then try to scroll the page behind it."
      >
        <label className="row">
          <input type="checkbox" checked={gap} onChange={(event) => setGap(event.target.checked)} />
          Compensate the scrollbar gap (no layout shift)
        </label>
        <div className="row">
          <Button variant="primary" onClick={() => setOpen(true)}>
            Open overlay
          </Button>
          <Button onClick={() => inspect('Now')}>Log body styles</Button>
        </div>
        <EventLog entries={entries} onClear={clear} />
      </Panel>
      <Callout title="Avoiding the shift without JavaScript">
        <code>scrollbar-gutter: stable</code> on <code>html</code> always reserves space for the
        scrollbar, so locking never shifts the layout. Fixed-position elements are not padded by
        this hook.
      </Callout>
      {open ? (
        <Overlay
          title="Settings"
          reserveScrollbarGap={gap}
          onOpened={() => inspect('Overlay opened')}
          onClose={() => {
            setOpen(false);
            setConfirmOpen(false);
          }}
        >
          <p>The page behind this overlay cannot scroll.</p>
          <Button onClick={() => setConfirmOpen(true)}>Open nested confirmation</Button>
          {confirmOpen ? (
            <Overlay
              title="Discard changes?"
              reserveScrollbarGap={gap}
              onOpened={() => inspect('Nested opened (2 locks)')}
              onClose={() => {
                setConfirmOpen(false);
                // Read after React has run the nested overlay's cleanup.
                queueMicrotask(() => inspect('Nested closed (1 lock left)'));
              }}
            >
              <p>Closing this keeps the page locked — the first overlay still holds a lock.</p>
            </Overlay>
          ) : null}
        </Overlay>
      ) : null}
    </div>
  );
}

interface OverlayProps {
  title: string;
  reserveScrollbarGap: boolean;
  onOpened: () => void;
  onClose: () => void;
  children: ReactNode;
}

function Overlay({ title, reserveScrollbarGap, onOpened, onClose, children }: OverlayProps) {
  useScrollLock(true, { reserveScrollbarGap });
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openedRef = useRef(onOpened);

  // Move focus into the dialog, and back to the opener when it closes.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    openedRef.current();
    return () => opener?.focus();
  }, []);

  useEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // Only the innermost dialog that contains focus closes.
    const focusedDialog = document.activeElement?.closest('[role="dialog"]');
    if (focusedDialog && focusedDialog === closeRef.current?.closest('[role="dialog"]')) onClose();
  });

  return (
    <div className="use-scroll-lock-demo-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card stack use-scroll-lock-demo-dialog"
      >
        <h4 id={titleId}>{title}</h4>
        {children}
        <button ref={closeRef} type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
