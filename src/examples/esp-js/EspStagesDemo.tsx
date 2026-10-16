import { Router } from 'esp-js';
import { useState } from 'react';
import {
  Button,
  Callout,
  EventLog,
  Panel,
  TextField,
  ValueTable,
  useEventLog,
} from '../../components/ui';
import { EspRouterProvider, useEspReducer, type EspStoreAction } from '../../middleware/esp-js';

const ORDER_PLACED = 'ORDER_PLACED';

interface Order {
  symbol: string;
  quantity: number;
}

type Action = { type: typeof ORDER_PLACED; payload: Order };
type State = { orders: Order[] };

function reducer(state: State, action: EspStoreAction<Action>): State {
  return action.type === ORDER_PLACED ? { orders: [...state.orders, action.payload] } : state;
}

/**
 * esp-js observation stages: preview (may cancel) → normal (may commit) →
 * committed (only if committed) → final. The bridge forwards final-stage
 * events to the reducer, so a canceled event never changes React state.
 */
export default function EspStagesDemo() {
  const [router] = useState(() => new Router());
  return (
    <EspRouterProvider router={router}>
      <OrderDesk />
    </EspRouterProvider>
  );
}

function OrderDesk() {
  const [maxQuantity, setMaxQuantity] = useState(100);
  const [symbol, setSymbol] = useState('EURUSD');
  const [quantity, setQuantity] = useState(10);
  const { entries, log, clear } = useEventLog(60);

  const [state, , esp] = useEspReducer<State, Action>(
    reducer,
    { orders: [] },
    {
      modelName: 'order-desk',
      observedEvents: [ORDER_PLACED],
      commitEventTypes: [ORDER_PLACED],
      // The filter reads the latest `maxQuantity` without re-registering the model.
      filters: { [ORDER_PLACED]: (event) => (event as Order).quantity <= maxQuantity },
      onStage: (info) => {
        if (info.stage === 'preProcess' || info.stage === 'postProcess') return;
        log(
          `${info.stage}${info.event ? ` ${JSON.stringify(info.event)}` : ''}`,
          info.stage === 'canceled' ? 'error' : info.stage === 'final' ? 'success' : 'info',
        );
      },
    },
  );

  return (
    <div className="stack">
      <Panel title="Place an order through the router">
        <div className="row">
          <TextField
            label="Symbol"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
          />
          <TextField
            label="Quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
          <TextField
            label="Risk limit (preview filter)"
            type="number"
            min={1}
            value={maxQuantity}
            onChange={(event) => setMaxQuantity(Number(event.target.value))}
          />
        </div>
        <div className="row">
          <Button
            variant="primary"
            onClick={() =>
              esp.publish(ORDER_PLACED, { symbol: symbol.trim() || 'EURUSD', quantity })
            }
          >
            Publish ORDER_PLACED
          </Button>
        </div>
        <ValueTable
          label="Accepted orders"
          rows={{
            'Orders in reducer state': state.orders.length,
            Latest: state.orders.at(-1) ? JSON.stringify(state.orders.at(-1)) : '—',
          }}
        />
      </Panel>
      <EventLog title="Observation stages" entries={entries} onClear={clear} />
      <Callout title="Try it">
        Set the quantity above the risk limit: the preview-stage filter cancels the event, so the
        normal, committed and final stages never run and the reducer is never called.
      </Callout>
    </div>
  );
}
