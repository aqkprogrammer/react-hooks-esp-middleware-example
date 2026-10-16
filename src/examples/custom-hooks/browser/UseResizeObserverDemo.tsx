import { useRef, useState } from 'react';
import { Badge, Callout, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useElementSize, useResizeObserver } from '../../../hooks';
import './UseResizeObserverDemo.css';

/**
 * `useElementSize` drives a component-level breakpoint; `useResizeObserver`
 * logs raw entries for a resizable textarea.
 */
export default function UseResizeObserverDemo() {
  return (
    <div className="stack">
      <ElementSizePanel />
      <ResizeObserverPanel />
      <Callout title="Container queries may be enough">
        If the size only changes styles, CSS <code>@container</code> queries do it without
        JavaScript. Measure in JS when behaviour depends on the size (virtualisation, charts,
        choosing what to render).
      </Callout>
    </div>
  );
}

function ElementSizePanel() {
  const [box, setBox] = useState<'content-box' | 'border-box'>('content-box');
  const { ref, width, height, isSupported } = useElementSize<HTMLDivElement>({ box });
  const wide = width >= 360;
  return (
    <Panel
      title="useElementSize"
      description="Drag the bottom-right corner of the box. Its layout switches to two columns at 360px."
    >
      <fieldset className="row">
        <legend className="small muted">Measured box</legend>
        {(['content-box', 'border-box'] as const).map((option) => (
          <label key={option} className="row">
            <input
              type="radio"
              name="use-resize-observer-demo-box"
              value={option}
              checked={box === option}
              onChange={() => setBox(option)}
            />
            {option}
          </label>
        ))}
      </fieldset>
      <div ref={ref} className="use-resize-observer-demo-box">
        <div className="use-resize-observer-demo-layout" data-wide={wide}>
          <div className="card small">Column A</div>
          <div className="card small">Column B</div>
        </div>
      </div>
      <ValueTable
        rows={{
          [`${box} size`]: `${Math.round(width)} × ${Math.round(height)} px`,
          Layout: (
            <Badge tone={wide ? 'info' : 'neutral'}>{wide ? 'two columns' : 'stacked'}</Badge>
          ),
          'ResizeObserver supported': String(isSupported),
        }}
      />
      <p className="small muted">
        The box has 16px padding and a 6px border, so border-box is 44px larger in each direction.
      </p>
    </Panel>
  );
}

function ResizeObserverPanel() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [enabled, setEnabled] = useState(true);
  const { entries, log, clear } = useEventLog(15);
  const { isSupported } = useResizeObserver(
    textareaRef,
    (entry) => {
      const size = entry.borderBoxSize?.[0];
      log(
        size
          ? `border-box ${Math.round(size.inlineSize)} × ${Math.round(size.blockSize)}`
          : `content ${Math.round(entry.contentRect.width)} × ${Math.round(entry.contentRect.height)}`,
      );
    },
    { box: 'border-box', enabled },
  );
  return (
    <Panel
      title="useResizeObserver"
      description="Resize the textarea (or type until it grows). Every observation is logged."
    >
      <label className="field">
        <span className="field-label">Notes</span>
        <textarea ref={textareaRef} className="input use-resize-observer-demo-textarea" />
      </label>
      <label className="row">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Observing
      </label>
      {isSupported ? null : (
        <Callout tone="warn">ResizeObserver is not available in this browser.</Callout>
      )}
      <EventLog entries={entries} onClear={clear} title="Resize entries" />
    </Panel>
  );
}
