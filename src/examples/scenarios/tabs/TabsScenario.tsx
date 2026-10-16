import { Activity, useId, useState, type FocusEvent, type ReactNode } from 'react';
import { Callout, Panel } from '../../../components/ui';
import { useRovingTabIndex } from '../../../hooks';
import { ChecklistPanel, NotesPanel, TimerPanel } from './TabPanels';
import './TabsScenario.css';

interface TabDefinition {
  id: string;
  label: string;
  render: () => ReactNode;
}

const TABS: readonly TabDefinition[] = [
  { id: 'notes', label: 'Notes', render: () => <NotesPanel /> },
  { id: 'timer', label: 'Timer', render: () => <TimerPanel /> },
  { id: 'checklist', label: 'Checklist', render: () => <ChecklistPanel /> },
];

/**
 * WAI-ARIA APG tabs with a switch between automatic activation (a tab is
 * selected as soon as it receives focus) and manual activation (arrow keys
 * only move focus; Enter or Space selects). Panels render lazily on first
 * visit and are then kept alive with React's `<Activity>`.
 */
export default function TabsScenario() {
  const baseId = useId();
  const modeId = useId();
  const [automatic, setAutomatic] = useState(true);
  const [selected, setSelected] = useState(0);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([0]));

  const select = (index: number) => {
    setSelected(index);
    setVisited((previous) => (previous.has(index) ? previous : new Set(previous).add(index)));
  };

  const { setActiveIndex, getItemProps } = useRovingTabIndex({
    count: TABS.length,
    orientation: 'horizontal',
    initialIndex: 0,
    // Automatic activation: moving focus selects.
    onActiveChange: automatic ? select : undefined,
  });

  // Manual mode: when focus leaves the tab list, its tab stop returns to the
  // selected tab, so Tab/Shift+Tab come back to it (APG).
  const onTablistBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setActiveIndex(selected);
  };

  const tabId = (index: number) => `${baseId}-tab-${index}`;
  const panelId = (index: number) => `${baseId}-panel-${index}`;

  return (
    <div className="stack">
      <Panel
        title="Meeting workspace"
        description="Focus a tab and use ←/→, Home and End. Switch to manual activation to move focus without selecting, then press Enter or Space."
      >
        <label className="row" htmlFor={modeId}>
          <input
            id={modeId}
            type="checkbox"
            checked={automatic}
            onChange={(event) => setAutomatic(event.target.checked)}
          />
          Automatic activation (select a tab when it receives focus)
        </label>

        <div className="tabs">
          <div
            role="tablist"
            aria-label="Meeting workspace"
            className="tabs-list"
            onBlur={onTablistBlur}
          >
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                {...getItemProps(index)}
                id={tabId(index)}
                type="button"
                role="tab"
                aria-selected={index === selected}
                aria-controls={panelId(index)}
                className="tabs-tab"
                onClick={() => {
                  select(index);
                  setActiveIndex(index);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {TABS.map((tab, index) => (
            <div
              key={tab.id}
              id={panelId(index)}
              role="tabpanel"
              aria-labelledby={tabId(index)}
              tabIndex={0}
              hidden={index !== selected}
              className="tabs-panel"
            >
              {/* Lazy: nothing renders before the first visit. Then <Activity>
                  keeps the subtree (and its state) while hidden. */}
              {visited.has(index) ? (
                <Activity mode={index === selected ? 'visible' : 'hidden'} name={tab.label}>
                  {tab.render()}
                </Activity>
              ) : null}
            </div>
          ))}
        </div>
        <p className="muted small">
          Rendered so far:{' '}
          {TABS.filter((_tab, index) => visited.has(index))
            .map((tab) => tab.label)
            .join(', ')}
        </p>
      </Panel>
      <Callout title="Automatic or manual?">
        APG recommends automatic activation when panels display instantly — like here, once
        rendered. Use manual activation when showing a panel is slow (a network request, a heavy
        render), so arrowing past a tab does not trigger that work.
      </Callout>
    </div>
  );
}
