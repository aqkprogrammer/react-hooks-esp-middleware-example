import { useId, useState } from 'react';
import { Panel } from '../../../components/ui';
import { useRovingTabIndex } from '../../../hooks';
import './UseRovingTabIndexDemo.css';

type Mark = 'bold' | 'italic' | 'underline';
type Align = 'left' | 'center' | 'right';

interface ToolbarItem {
  label: string;
  kind: 'mark' | 'align' | 'action';
  value: string;
}

const TOOLBAR: ToolbarItem[] = [
  { label: 'Bold', kind: 'mark', value: 'bold' },
  { label: 'Italic', kind: 'mark', value: 'italic' },
  { label: 'Underline', kind: 'mark', value: 'underline' },
  { label: 'Align left', kind: 'align', value: 'left' },
  { label: 'Align center', kind: 'align', value: 'center' },
  { label: 'Align right', kind: 'align', value: 'right' },
  { label: 'Clear formatting', kind: 'action', value: 'clear' },
];

const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    body: 'One Tab stop for the whole tab list; arrows move between tabs.',
  },
  {
    id: 'specs',
    label: 'Specs',
    body: 'Selection follows focus: moving to a tab shows its panel.',
  },
  { id: 'reviews', label: 'Reviews', body: 'Home and End jump to the first and last tab.' },
];

/** A formatting toolbar and a vertical tab list, both using roving tabindex. */
export default function UseRovingTabIndexDemo() {
  return (
    <div className="stack">
      <FormattingToolbar />
      <VerticalTabs />
    </div>
  );
}

function FormattingToolbar() {
  const [marks, setMarks] = useState<ReadonlySet<Mark>>(() => new Set());
  const [align, setAlign] = useState<Align>('left');
  const [loop, setLoop] = useState(true);
  const nothingToClear = marks.size === 0 && align === 'left';

  const roving = useRovingTabIndex({
    count: TOOLBAR.length,
    loop,
    // A disabled button cannot take focus, so it must be skipped.
    isDisabled: (index) => TOOLBAR[index]?.value === 'clear' && nothingToClear,
  });

  const activate = (item: ToolbarItem) => {
    if (item.kind === 'mark') {
      const mark = item.value as Mark;
      setMarks((previous) => {
        const next = new Set(previous);
        if (next.has(mark)) next.delete(mark);
        else next.add(mark);
        return next;
      });
    } else if (item.kind === 'align') {
      setAlign(item.value as Align);
    } else {
      setMarks(new Set());
      setAlign('left');
      // "Clear" is about to become disabled (and lose focus): move focus first.
      roving.setActiveIndex(0, { focus: true });
    }
  };

  const previewClass = [
    'roving-demo-preview',
    ...[...marks].map((mark) => `roving-demo-${mark}`),
    `roving-demo-align-${align}`,
  ].join(' ');

  return (
    <Panel
      title="Formatting toolbar"
      description="Tab into the toolbar, then use ←/→, Home and End. Tab again leaves it."
    >
      <div role="toolbar" aria-label="Text formatting" className="roving-demo-toolbar">
        {TOOLBAR.map((item, index) => {
          const pressed =
            item.kind === 'mark'
              ? marks.has(item.value as Mark)
              : item.kind === 'align'
                ? align === item.value
                : undefined;
          return (
            <button
              key={item.value}
              type="button"
              className="btn btn-sm"
              aria-pressed={pressed}
              disabled={item.value === 'clear' && nothingToClear}
              onClick={() => activate(item)}
              {...roving.getItemProps(index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <p className={previewClass}>The quick brown fox jumps over the lazy dog.</p>
      <label className="row">
        <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} />
        Wrap around at the ends
      </label>
    </Panel>
  );
}

function VerticalTabs() {
  const [selected, setSelected] = useState(0);
  const baseId = useId();
  const roving = useRovingTabIndex({
    count: TABS.length,
    orientation: 'vertical',
    initialIndex: selected,
    onActiveChange: setSelected,
  });
  return (
    <Panel title="Vertical tabs" description="Use ↑/↓ in the tab list.">
      <div className="roving-demo-tabs">
        <div
          role="tablist"
          aria-label="Product"
          aria-orientation="vertical"
          className="roving-demo-tablist"
        >
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              className="btn btn-sm"
              aria-selected={selected === index}
              aria-controls={`${baseId}-panel-${tab.id}`}
              onClick={() => setSelected(index)}
              {...roving.getItemProps(index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {TABS.map((tab, index) => (
          <div
            key={tab.id}
            id={`${baseId}-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            tabIndex={0}
            hidden={selected !== index}
            className="roving-demo-tabpanel"
          >
            <h4>{tab.label}</h4>
            <p>{tab.body}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
