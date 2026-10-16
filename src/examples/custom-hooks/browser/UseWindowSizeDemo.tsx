import { useState } from 'react';
import { Callout, Panel, RenderCount, ValueTable } from '../../../components/ui';
import { useWindowSize } from '../../../hooks';

/** The same hook with and without throttling, side by side with commit counts. */
export default function UseWindowSizeDemo() {
  const [throttleMs, setThrottleMs] = useState(250);
  return (
    <div className="stack">
      <p>Resize the browser window and compare how often each reader commits.</p>
      <div className="grid">
        <Panel title="Every resize event">
          <RenderCount label="Unthrottled">
            <SizeReadout throttleMs={0} />
          </RenderCount>
        </Panel>
        <Panel title={`Throttled (${throttleMs} ms)`}>
          <RenderCount label="Throttled">
            <SizeReadout throttleMs={throttleMs} />
          </RenderCount>
        </Panel>
      </div>
      <label className="field">
        <span className="field-label">Throttle interval: {throttleMs} ms</span>
        <input
          type="range"
          min={50}
          max={1000}
          step={50}
          value={throttleMs}
          onChange={(event) => setThrottleMs(Number(event.target.value))}
        />
      </label>
      <Callout title="Breakpoints? Use useMediaQuery">
        A component that only needs “mobile or desktop” should not re-render for every pixel —
        <code>useMediaQuery</code> only updates when the breakpoint is crossed.
      </Callout>
    </div>
  );
}

function SizeReadout({ throttleMs }: { throttleMs: number }) {
  const { width, height } = useWindowSize({ throttleMs, serverSize: { width: 1024, height: 768 } });
  return (
    <ValueTable
      rows={{
        Width: `${width}px`,
        Height: `${height}px`,
        'Aspect ratio': height > 0 ? (width / height).toFixed(2) : '—',
      }}
    />
  );
}
