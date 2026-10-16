import { memo, useState } from 'react';
import { Button, Callout, Panel, RenderCount } from '../../../components/ui';

interface ChartProps {
  label: string;
  points: readonly number[];
}

const initialPoints: readonly number[] = [12, 48, 30, 75, 52];

/**
 * `memo` is a component API, not a Hook: it wraps a component so React can
 * skip re-rendering it when its props are equal. The same view is rendered
 * three ways — plain, `memo` (shallow `Object.is` per prop) and `memo` with a
 * custom `arePropsEqual` that compares array contents.
 */
export default function MemoDemo() {
  const [points, setPoints] = useState(initialPoints);
  const [unrelated, setUnrelated] = useState(0);

  return (
    <div className="stack">
      <Panel title="Parent controls" description={`Parent renders: ${unrelated + 1}`}>
        <div className="row">
          <Button onClick={() => setUnrelated((value) => value + 1)}>Re-render parent only</Button>
          <Button onClick={() => setPoints((previous) => [...previous])}>
            Replace data with an equal copy
          </Button>
          <Button
            onClick={() =>
              setPoints((previous) =>
                previous.map((value, index) => (index === 0 ? (value + 17) % 100 : value)),
              )
            }
          >
            Change the first value
          </Button>
        </div>
      </Panel>
      <div className="grid">
        <PlainChart label="Plain component" points={points} />
        <ShallowMemoChart label="memo(Chart)" points={points} />
        <ContentMemoChart label="memo(Chart, arePropsEqual)" points={points} />
      </div>
      <Callout title="Reading the counters">
        “Re-render parent only” skips both memoised charts. “Equal copy” is a new array reference,
        so only the custom comparison skips it. A real change re-renders all three.
      </Callout>
    </div>
  );
}

function ChartView({ label, points }: ChartProps) {
  return (
    <section className="card" aria-label={label}>
      <RenderCount label={label}>
        <ul className="list small" aria-label={`${label} values`}>
          {/* Points are positional (a fixed-length series without state), so the index is their identity. */}
          {points.map((value, index) => (
            <li key={index} className="row">
              <span className="mono">{String(value).padStart(2, '0')}</span>
              <meter min={0} max={100} value={value} aria-label={`Point ${index + 1}`} />
            </li>
          ))}
        </ul>
      </RenderCount>
    </section>
  );
}

/** Element-wise comparison of `points`; every other prop must still be compared. */
function arePointsEqual(previous: ChartProps, next: ChartProps): boolean {
  if (previous.label !== next.label) return false;
  if (previous.points === next.points) return true;
  return (
    previous.points.length === next.points.length &&
    previous.points.every((value, index) => Object.is(value, next.points[index]))
  );
}

const PlainChart = ChartView;
const ShallowMemoChart = memo(ChartView);
const ContentMemoChart = memo(ChartView, arePointsEqual);
