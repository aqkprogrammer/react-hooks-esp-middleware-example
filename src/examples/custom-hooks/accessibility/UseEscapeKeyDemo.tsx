import { useId, useRef, useState } from 'react';
import { Button, EventLog, Panel, useEventLog } from '../../../components/ui';
import { useEscapeKey } from '../../../hooks';

const SORTS = ['Newest first', 'Oldest first', 'Most popular'];

/**
 * Two nested layers: a filter panel and a sort menu inside it. Each press of
 * Escape closes only the topmost one and returns focus to its opener.
 */
export default function UseEscapeKeyDemo() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sort, setSort] = useState(SORTS[0] ?? '');
  const panelButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const menuId = useId();
  const { entries, log, clear } = useEventLog();

  const closePanel = (reason: string) => {
    setPanelOpen(false);
    setMenuOpen(false);
    panelButton.current?.focus();
    log(`filter panel closed (${reason})`);
  };
  const closeMenu = (reason: string) => {
    setMenuOpen(false);
    menuButton.current?.focus();
    log(`sort menu closed (${reason})`);
  };

  useEscapeKey(() => closePanel('Escape'), { enabled: panelOpen });
  useEscapeKey(() => closeMenu('Escape'), { enabled: menuOpen });

  return (
    <div className="stack">
      <Panel
        title="Nested layers"
        description="Open both layers, then press Escape twice. Each press closes one layer."
      >
        <div className="row">
          <button
            ref={panelButton}
            type="button"
            className="btn"
            aria-expanded={panelOpen}
            aria-controls={panelId}
            onClick={() => (panelOpen ? closePanel('button') : setPanelOpen(true))}
          >
            Filters
          </button>
          <span className="muted small">Sort: {sort}</span>
        </div>
        <div id={panelId} hidden={!panelOpen} className="card stack">
          <label className="row">
            <input type="checkbox" defaultChecked /> In stock only
          </label>
          <div className="row">
            <button
              ref={menuButton}
              type="button"
              className="btn btn-sm"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => (menuOpen ? closeMenu('button') : setMenuOpen(true))}
            >
              Sort order
            </button>
            <Button size="sm" variant="ghost" onClick={() => closePanel('button')}>
              Close filters
            </Button>
          </div>
          <ul id={menuId} hidden={!menuOpen} className="list" aria-label="Sort order">
            {SORTS.map((option) => (
              <li key={option}>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-pressed={sort === option}
                  onClick={() => {
                    setSort(option);
                    closeMenu(`picked ${option}`);
                  }}
                >
                  {option}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
      <EventLog entries={entries} onClear={clear} />
    </div>
  );
}
