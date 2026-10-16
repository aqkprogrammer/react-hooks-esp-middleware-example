import { useId, useRef, useState } from 'react';
import { Button, Callout, EventLog, Panel, useEventLog } from '../../../components/ui';
import { useEscapeKey, useFocusTrap } from '../../../hooks';
import './UseFocusTrapDemo.css';

const SECTIONS = ['Home', 'Products', 'Pricing', 'Blog'];

/**
 * A custom slide-in menu built from a <div> (as many design systems still
 * do): it needs a focus trap, Escape handling and focus restoration — all
 * of which a native <dialog> would give for free (see useDialogState).
 */
export default function UseFocusTrapDemo() {
  const [open, setOpen] = useState(false);
  const { entries, log, clear } = useEventLog();
  return (
    <div className="stack">
      <Panel
        title="Custom menu drawer"
        description="Open it, press Tab and Shift+Tab: focus cycles inside. Escape or Close returns focus here."
      >
        <div className="row">
          <Button variant="primary" aria-haspopup="dialog" onClick={() => setOpen(true)}>
            Open menu
          </Button>
          <Button onClick={() => log('focusable element outside the drawer')}>
            A button behind the drawer
          </Button>
        </div>
        {open ? (
          <MenuDrawer
            onClose={() => setOpen(false)}
            onNavigate={(section) => {
              log(`navigated to ${section}`, 'success');
              setOpen(false);
            }}
          />
        ) : null}
      </Panel>
      <EventLog entries={entries} onClear={clear} />
      <Callout title="Prefer a native <dialog>">
        <code>dialog.showModal()</code> already makes the page behind it inert, closes on Escape and
        restores focus. Reach for a focus trap only for overlays that cannot be a dialog.
      </Callout>
    </div>
  );
}

function MenuDrawer({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (section: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [shortcuts, setShortcuts] = useState<string[]>([]);
  useFocusTrap(ref);
  useEscapeKey(onClose);

  return (
    <div className="focus-trap-demo-backdrop">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="focus-trap-demo-drawer"
      >
        <div className="spread">
          <h4 id={titleId} className="focus-trap-demo-title">
            Menu
          </h4>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <nav aria-label="Sections">
          <ul className="focus-trap-demo-links">
            {[...SECTIONS, ...shortcuts].map((section) => (
              <li key={section}>
                <Button variant="ghost" onClick={() => onNavigate(section)}>
                  {section}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
        <Button
          size="sm"
          onClick={() =>
            setShortcuts((previous) => [...previous, `Saved page ${previous.length + 1}`])
          }
        >
          Add a saved page
        </Button>
        <p className="muted small">Items added while open join the Tab cycle.</p>
      </div>
    </div>
  );
}
