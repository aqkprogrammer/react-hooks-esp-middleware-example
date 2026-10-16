import { useId, useRef, useState } from 'react';
import { Badge, Callout, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useClickOutside, useEventListener } from '../../../hooks';
import './UseClickOutsideDemo.css';

const FILTERS = ['In stock', 'On sale', 'Free shipping', 'New arrivals'] as const;

/**
 * A filter popover that closes when you press anywhere outside it. The toggle
 * button is in `ignore`, so pressing it does not close-then-reopen the menu.
 */
export default function UseClickOutsideDemo() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const { entries, log, clear } = useEventLog();
  const popoverRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const close = (reason: string) => {
    setOpen(false);
    log(`Closed: ${reason}`);
  };

  useClickOutside(
    popoverRef,
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const label = target?.textContent?.trim().slice(0, 30) || target?.tagName.toLowerCase();
      close(`${event.type} outside (on “${label ?? 'page'}”)`);
    },
    // Only listen while the popover is open: no work at all when closed.
    { enabled: open, ignore: [toggleRef] },
  );

  // Keyboard users never "click outside" — Escape must close too.
  useEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') return;
      close('Escape key');
      toggleRef.current?.focus();
    },
    open ? undefined : null,
  );

  const toggleFilter = (filter: string) =>
    setSelected((previous) =>
      previous.includes(filter)
        ? previous.filter((item) => item !== filter)
        : [...previous, filter],
    );

  return (
    <div className="stack">
      <Panel
        title="Filter popover"
        description="Open the menu, then press anywhere else on the page (or press Escape)."
      >
        <div className="row">
          <div className="use-click-outside-demo-anchor">
            {/* A native button: the UI kit Button does not forward refs. */}
            <button
              type="button"
              className="btn btn-secondary"
              ref={toggleRef}
              aria-expanded={open}
              aria-controls={popoverId}
              onClick={() => {
                setOpen((value) => !value);
                log(open ? 'Closed: toggle button' : 'Opened');
              }}
            >
              Filters {selected.length > 0 ? `(${selected.length})` : ''}
            </button>
            {open ? (
              <div ref={popoverRef} id={popoverId} className="use-click-outside-demo-popover">
                <fieldset>
                  <legend className="small muted">Show only</legend>
                  {FILTERS.map((filter) => (
                    <label key={filter}>
                      <input
                        type="checkbox"
                        checked={selected.includes(filter)}
                        onChange={() => toggleFilter(filter)}
                      />
                      {filter}
                    </label>
                  ))}
                </fieldset>
              </div>
            ) : null}
          </div>
          <Badge tone={open ? 'success' : 'neutral'}>{open ? 'open' : 'closed'}</Badge>
        </div>
        <ValueTable
          rows={{
            'Active filters': selected.length > 0 ? selected.join(', ') : 'none',
            'Outside listener': open ? 'attached (capture phase, document)' : 'detached',
          }}
        />
        <EventLog entries={entries} onClear={clear} />
      </Panel>
      <Callout title="Why the capture phase?">
        The hook listens on <code>document</code> during capture, so it still sees presses when a
        component calls <code>stopPropagation()</code>, and it runs before React re-renders and
        possibly removes the pressed element.
      </Callout>
    </div>
  );
}
