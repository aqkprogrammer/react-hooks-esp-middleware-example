import { useId, useState } from 'react';
import { Badge, Callout, Panel, ValueTable } from '../../../components/ui';
import { useElementSize, useMediaQuery, useRovingTabIndex, useWindowSize } from '../../../hooks';
import {
  CONTAINER_BREAKPOINTS,
  VIEWPORT_QUERIES,
  modeForViewport,
  modeForWidth,
  type LayoutMode,
  type LayoutSource,
} from './layoutRules';
import './ResponsiveLayoutScenario.css';

interface Section {
  id: string;
  title: string;
  body: string;
}

const SECTIONS: readonly Section[] = [
  { id: 'profile', title: 'Profile', body: 'Name, avatar and the public parts of your account.' },
  {
    id: 'notifications',
    title: 'Notifications',
    body: 'Choose which events send an email, a push notification, or nothing.',
  },
  {
    id: 'privacy',
    title: 'Privacy',
    body: 'Who can see your activity, and how to export your data.',
  },
];

const MAX_WIDTH = 960;

/**
 * One settings screen, three component trees: a sidebar, tabs, or stacked
 * sections. The choice can follow the *container's* width (useElementSize)
 * or the *viewport* (useMediaQuery); useWindowSize only reports numbers.
 */
export default function ResponsiveLayoutScenario() {
  const [source, setSource] = useState<LayoutSource>('container');
  const [maxWidth, setMaxWidth] = useState(MAX_WIDTH);
  const [selected, setSelected] = useState(0);
  const {
    ref: containerRef,
    width: containerWidth,
    isSupported,
  } = useElementSize<HTMLElement>({
    box: 'border-box',
  });
  const viewport = useWindowSize({ throttleMs: 100 });
  const wide = useMediaQuery(VIEWPORT_QUERIES.sidebar);
  const medium = useMediaQuery(VIEWPORT_QUERIES.tabs);
  const sliderId = useId();

  // Without ResizeObserver the container width is unknown: fall back to the viewport.
  const effectiveSource: LayoutSource =
    source === 'container' && !isSupported ? 'viewport' : source;
  const mode: LayoutMode =
    effectiveSource === 'container'
      ? modeForWidth(containerWidth)
      : modeForViewport({ sidebar: wide, tabs: medium });

  return (
    <div className="stack">
      <Panel title="Controls">
        <fieldset className="responsive-fieldset">
          <legend className="field-label">Decide the layout by</legend>
          <label className="row small">
            <input
              type="radio"
              name="layout-source"
              checked={source === 'container'}
              onChange={() => setSource('container')}
            />
            Container width (useElementSize)
          </label>
          <label className="row small">
            <input
              type="radio"
              name="layout-source"
              checked={source === 'viewport'}
              onChange={() => setSource('viewport')}
            />
            Viewport width (useMediaQuery)
          </label>
        </fieldset>
        <div className="field">
          <label htmlFor={sliderId} className="field-label">
            Container max width: {maxWidth >= MAX_WIDTH ? 'full' : `${maxWidth}px`}
          </label>
          <input
            id={sliderId}
            type="range"
            min={280}
            max={MAX_WIDTH}
            step={20}
            value={maxWidth}
            onChange={(event) => setMaxWidth(Number(event.target.value))}
          />
          <p className="field-hint">
            Narrow the container without resizing the window: only the container strategy reacts.
          </p>
        </div>
        {source === 'container' && !isSupported ? (
          <Callout tone="warn" title="ResizeObserver unavailable">
            The container cannot be measured here, so the layout follows the viewport instead.
          </Callout>
        ) : null}
        <ValueTable
          label="Measurements"
          rows={{
            'Viewport (useWindowSize)': `${viewport.width} × ${viewport.height}`,
            'Container (useElementSize)': isSupported ? `${Math.round(containerWidth)} px` : 'n/a',
            [VIEWPORT_QUERIES.sidebar]: String(wide),
            [VIEWPORT_QUERIES.tabs]: String(medium),
            'Layout decided by': effectiveSource,
            Layout: mode,
          }}
        />
      </Panel>

      <section
        ref={containerRef}
        aria-label="Settings preview"
        className="responsive-container"
        style={{ maxWidth: maxWidth >= MAX_WIDTH ? '100%' : `${maxWidth}px` }}
      >
        <div className="spread">
          <strong>Settings</strong>
          <Badge tone="info">{mode} layout</Badge>
        </div>
        {mode === 'sidebar' ? (
          <SidebarLayout selected={selected} onSelect={setSelected} />
        ) : mode === 'tabs' ? (
          <TabsLayout selected={selected} onSelect={setSelected} />
        ) : (
          <StackedLayout />
        )}
        <ProfileCard />
      </section>

      <Callout title="Prefer CSS when only the styling changes">
        The profile card above switches between a column and a row with a CSS container query (
        <code>@container (min-width: 420px)</code>) — no JavaScript, no re-render, works before
        hydration. Measure in JavaScript only when the <em>component tree</em> must differ, as with
        tabs versus a sidebar (different ARIA roles and keyboard behaviour). Container breakpoints
        here: sidebar ≥ {CONTAINER_BREAKPOINTS.sidebar}px, tabs ≥ {CONTAINER_BREAKPOINTS.tabs}px.
      </Callout>
    </div>
  );
}

interface SelectableProps {
  selected: number;
  onSelect: (index: number) => void;
}

function SectionBody({ section }: { section: Section }) {
  return <p className="responsive-section-body">{section.body}</p>;
}

function SidebarLayout({ selected, onSelect }: SelectableProps) {
  const section = SECTIONS[selected] ?? SECTIONS[0];
  return (
    <div className="responsive-sidebar">
      <nav aria-label="Settings sections">
        <ul className="responsive-nav">
          {SECTIONS.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                className="responsive-nav-item"
                aria-current={index === selected ? 'true' : undefined}
                onClick={() => onSelect(index)}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {section ? (
        <div>
          <h4 className="responsive-heading">{section.title}</h4>
          <SectionBody section={section} />
        </div>
      ) : null}
    </div>
  );
}

function TabsLayout({ selected, onSelect }: SelectableProps) {
  const baseId = useId();
  // Automatic activation (APG): moving focus with the arrow keys selects the tab.
  const { getItemProps } = useRovingTabIndex({
    count: SECTIONS.length,
    orientation: 'horizontal',
    initialIndex: selected,
    onActiveChange: onSelect,
  });
  const section = SECTIONS[selected] ?? SECTIONS[0];
  return (
    <div>
      <div role="tablist" aria-label="Settings sections" className="responsive-tablist">
        {SECTIONS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${index}`}
            aria-selected={index === selected}
            aria-controls={`${baseId}-panel`}
            className="responsive-tab"
            {...getItemProps(index)}
            onClick={() => onSelect(index)}
          >
            {item.title}
          </button>
        ))}
      </div>
      {section ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${selected}`}
          tabIndex={0}
          className="responsive-tabpanel"
        >
          <SectionBody section={section} />
        </div>
      ) : null}
    </div>
  );
}

function StackedLayout() {
  return (
    <div className="stack">
      {SECTIONS.map((section) => (
        <div key={section.id}>
          <h4 className="responsive-heading">{section.title}</h4>
          <SectionBody section={section} />
        </div>
      ))}
    </div>
  );
}

function ProfileCard() {
  return (
    <div className="responsive-card-host">
      <div className="responsive-card">
        <span className="responsive-avatar" aria-hidden="true">
          AL
        </span>
        <div>
          <strong>Ada Lovelace</strong>
          <p className="muted small responsive-card-text">
            This card re-flows with a CSS container query only.
          </p>
        </div>
      </div>
    </div>
  );
}
