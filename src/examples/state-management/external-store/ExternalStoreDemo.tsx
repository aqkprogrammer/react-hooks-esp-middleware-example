import { memo, useEffect, useState } from 'react';
import { Badge, Button, EventLog, Panel, RenderCount, useEventLog } from '../../../components/ui';
import { useStoreSelector } from '../../../middleware/reducer';
import {
  createPricesStore,
  PAIRS,
  selectQuote,
  selectTicks,
  type Pair,
  type PricesStore,
} from './pricesStore';

const FEED_INTERVAL_MS = 700;

/**
 * A reducer store created outside React and read with
 * `useSyncExternalStore` + selectors: each tile re-renders only when its own
 * pair changes, and a timer dispatches without any hook.
 */
export default function ExternalStoreDemo() {
  const { entries, log, clear } = useEventLog(20);
  // One store per mounted demo. In an app this would usually be a module
  // singleton or created by a provider.
  const [store] = useState(() =>
    createPricesStore(({ action, nextState }) =>
      log(
        `${action.type}${action.type === 'tick' ? ` ${action.pair}` : ''} → tick #${nextState.ticks}`,
      ),
    ),
  );
  const [feedOn, setFeedOn] = useState(false);

  useEffect(() => {
    if (!feedOn) return;
    let index = 0;
    // Plain JavaScript talking to the store: no setState, no React.
    const timer = setInterval(() => {
      const pair = PAIRS[index % PAIRS.length] ?? 'EURUSD';
      index += 1;
      store.dispatch({ type: 'tick', pair });
    }, FEED_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [feedOn, store]);

  return (
    <div className="stack">
      <div className="grid">
        {PAIRS.map((pair) => (
          <PriceTile key={pair} pair={pair} store={store} />
        ))}
      </div>
      <div className="row">
        <Button variant="primary" onClick={() => setFeedOn((on) => !on)} aria-pressed={feedOn}>
          {feedOn ? 'Stop price feed' : 'Start price feed'}
        </Button>
        <Button onClick={() => store.dispatch({ type: 'reset' })}>Reset prices</Button>
        <TickCounter store={store} />
      </div>
      <EventLog title="Store log (logger middleware)" entries={entries} onClear={clear} />
    </div>
  );
}

/**
 * `memo` stops the demo's own re-renders (every log line is React state)
 * from reaching the tiles, so the counters show only store-driven renders.
 */
const PriceTile = memo(function PriceTile({ pair, store }: { pair: Pair; store: PricesStore }) {
  return (
    <RenderCount label={pair}>
      <Quote pair={pair} store={store} />
    </RenderCount>
  );
});

function Quote({ pair, store }: { pair: Pair; store: PricesStore }) {
  const quote = useStoreSelector(store, selectQuote[pair]);
  return (
    <Panel title={pair}>
      <p className="mono" aria-label={`${pair} bid`}>
        {quote.bid}
      </p>
      <Badge tone={quote.move === 'up' ? 'success' : quote.move === 'down' ? 'warn' : 'neutral'}>
        {quote.move === 'up' ? '▲ up' : quote.move === 'down' ? '▼ down' : '– flat'}
      </Badge>
      <Button size="sm" onClick={() => store.dispatch({ type: 'tick', pair })}>
        Tick {pair}
      </Button>
    </Panel>
  );
}

function TickCounter({ store }: { store: PricesStore }) {
  const ticks = useStoreSelector(store, selectTicks);
  return (
    <span className="small" role="status">
      Ticks: {ticks}
    </span>
  );
}
