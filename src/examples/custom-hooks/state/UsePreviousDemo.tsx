import { useState } from 'react';
import { Button, Callout, Panel, ValueTable, show } from '../../../components/ui';
import { usePrevious } from '../../../hooks';

/**
 * The previous *distinct* value survives unrelated re-renders, so "it went
 * from 3 to 4" stays visible even when something else re-renders the component.
 */
export default function UsePreviousDemo() {
  const [price, setPrice] = useState(100);
  const [unrelated, setUnrelated] = useState(0);
  const previous = usePrevious(price);

  const trend = previous === undefined ? 'no change yet' : price > previous ? 'up' : 'down';
  const symbol = previous === undefined ? '–' : price > previous ? '▲' : '▼';

  return (
    <div className="stack">
      <Panel
        title="Price ticker"
        description="Change the price, then re-render without changing it: the previous value is kept."
      >
        <ValueTable
          label="Price"
          rows={{
            Current: <span className="mono">{price}</span>,
            Previous: <span className="mono">{show(previous)}</span>,
            Trend: (
              <span>
                <span aria-hidden="true">{symbol}</span> {trend}
              </span>
            ),
            'Unrelated re-renders': unrelated,
          }}
        />
        <div className="row">
          <Button onClick={() => setPrice((p) => p + 5)}>Price +5</Button>
          <Button onClick={() => setPrice((p) => p - 5)}>Price −5</Button>
          <Button variant="ghost" onClick={() => setUnrelated((n) => n + 1)}>
            Re-render without changing the price
          </Button>
        </div>
      </Panel>
      <Callout title="Why not “value from the previous render”?">
        A ref written in an Effect returns the value from the previous <em>render</em>: after any
        unrelated re-render it equals the current value. It also reads a ref during render, which
        React&apos;s rules forbid. If you only need a derived value, compute it during render
        instead.
      </Callout>
    </div>
  );
}
