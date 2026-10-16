import { useEffect, useId, useRef, useState } from 'react';
import {
  Badge,
  Button,
  EventLog,
  Panel,
  TextField,
  ValueTable,
  useEventLog,
} from '../../../components/ui';
import { useEspReducer, type EspStageInfo } from '../../../middleware/esp-js';
import { createSimulatedExchange } from './simulatedExchange';
import {
  ORDER_FILLED,
  ORDER_SUBMITTED,
  REFERENCE_PRICES,
  SYMBOLS,
  TRADE_BUSTED,
  blotterReducer,
  formatMoney,
  initialBlotter,
  initialPositions,
  initialTicket,
  isOrder,
  notional,
  positionTotals,
  positionsReducer,
  ticketReducer,
  type BlotterAction,
  type BlotterState,
  type Order,
  type PositionsAction,
  type PositionsState,
  type Side,
  type TicketAction,
  type TicketState,
} from './trading';

type Trace = (store: string, info: EspStageInfo) => void;

export interface TradingDeskProps {
  /** Delay before the simulated exchange fills an accepted order. */
  fillDelayMs?: number;
}

/**
 * Three independent `useEspReducer` stores on the router provided by the
 * parent. They never import each other: the ticket publishes to itself,
 * the exchange broadcasts fills, and the blotter broadcasts busts.
 */
export function TradingDesk({ fillDelayMs = 800 }: TradingDeskProps) {
  const { entries, log, clear } = useEventLog(80);
  const [showLifecycle, setShowLifecycle] = useState(false);
  const lifecycleId = useId();

  const trace: Trace = (store, info) => {
    const lifecycle = info.stage === 'preProcess' || info.stage === 'postProcess';
    if (lifecycle && !showLifecycle) return;
    const tone =
      info.stage === 'canceled' || info.stage === 'error'
        ? 'error'
        : info.stage === 'final'
          ? 'success'
          : 'info';
    log(`${store} · ${info.eventType || '(dispatch loop)'} · ${info.stage}`, tone);
  };

  return (
    <div className="stack">
      <div className="esp-desk-grid">
        <OrderTicket trace={trace} fillDelayMs={fillDelayMs} />
        <PositionSummary trace={trace} />
      </div>
      <TradeBlotter trace={trace} />
      <Panel
        title="Event inspector"
        description="Every observation stage of every event, per store (onStage)."
      >
        <div className="row small">
          <input
            id={lifecycleId}
            type="checkbox"
            checked={showLifecycle}
            onChange={(event) => setShowLifecycle(event.target.checked)}
          />
          <label htmlFor={lifecycleId}>Include preProcess / postProcess lifecycle</label>
        </div>
        <EventLog title="Router events" entries={entries} onClear={clear} />
      </Panel>
    </div>
  );
}

// ---- Order ticket ----------------------------------------------------------------

interface RejectedOrder {
  order: Order;
  reason: string;
}

function OrderTicket({ trace, fillDelayMs }: { trace: Trace; fillDelayMs: number }) {
  const [exchange] = useState(() => createSimulatedExchange(fillDelayMs));
  const [symbol, setSymbol] = useState(SYMBOLS[0] ?? 'ACME');
  const [side, setSide] = useState<Side>('buy');
  const [quantity, setQuantity] = useState(100);
  const [price, setPrice] = useState(REFERENCE_PRICES[SYMBOLS[0] ?? 'ACME'] ?? 100);
  const [riskLimit, setRiskLimit] = useState(50_000);
  const [rejected, setRejected] = useState<readonly RejectedOrder[]>([]);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const sequence = useRef(0);
  const symbolId = useId();
  const sideName = useId();

  // Pending fills must not fire into an unmounted desk.
  useEffect(() => () => exchange.dispose(), [exchange]);

  const [ticket, , esp] = useEspReducer<TicketState, TicketAction>(ticketReducer, initialTicket, {
    modelName: 'order-ticket',
    observedEvents: [ORDER_SUBMITTED, ORDER_FILLED],
    // Commit at the normal stage so the inspector also shows the `committed` stage.
    commitEventTypes: [ORDER_SUBMITTED],
    middleware: [exchange.middleware],
    // Preview-stage risk check; it always sees the latest limit (no re-registration).
    filters: {
      [ORDER_SUBMITTED]: (event) => isOrder(event) && notional(event) <= riskLimit,
    },
    onStage: (info) => {
      trace('Ticket', info);
      if (info.stage === 'canceled' && isOrder(info.event)) {
        const order = info.event;
        setRejected((current) =>
          [
            {
              order,
              reason: `Notional ${formatMoney(notional(order))} exceeds the ${formatMoney(riskLimit)} risk limit`,
            },
            ...current,
          ].slice(0, 5),
        );
      }
    },
  });

  const draftNotional = quantity * price;
  const valid = Number.isFinite(draftNotional) && quantity > 0 && price > 0;

  const placeOrder = () => {
    if (!valid) return;
    sequence.current += 1;
    const order: Order = {
      orderId: `O${sequence.current}`,
      symbol,
      side,
      quantity,
      price,
    };
    setLastOrderId(order.orderId);
    esp.publish(ORDER_SUBMITTED, order);
  };

  const status = (() => {
    if (!lastOrderId) return '';
    const rejection = rejected.find((entry) => entry.order.orderId === lastOrderId);
    if (rejection) return `Order ${lastOrderId} rejected: ${rejection.reason}.`;
    if (ticket.working.some((order) => order.orderId === lastOrderId)) {
      return `Order ${lastOrderId} accepted — waiting for a fill.`;
    }
    return `Order ${lastOrderId} filled.`;
  })();

  return (
    <Panel title="Order ticket" description={`Store: ${esp.modelId}`}>
      <div className="row">
        <div className="field">
          <label htmlFor={symbolId} className="field-label">
            Symbol
          </label>
          <select
            id={symbolId}
            value={symbol}
            onChange={(event) => {
              setSymbol(event.target.value);
              setPrice(REFERENCE_PRICES[event.target.value] ?? price);
            }}
          >
            {SYMBOLS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
        <fieldset className="esp-side">
          <legend className="field-label">Side</legend>
          {(['buy', 'sell'] as const).map((value) => (
            <label key={value} className="row small">
              <input
                type="radio"
                name={sideName}
                checked={side === value}
                onChange={() => setSide(value)}
              />
              {value === 'buy' ? 'Buy' : 'Sell'}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="row">
        <TextField
          label="Quantity"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.valueAsNumber)}
        />
        <TextField
          label="Limit price"
          type="number"
          min={0.01}
          step={0.01}
          value={price}
          onChange={(event) => setPrice(event.target.valueAsNumber)}
        />
        <TextField
          label="Risk limit (max notional)"
          type="number"
          min={0}
          step={1000}
          value={riskLimit}
          onChange={(event) => setRiskLimit(event.target.valueAsNumber || 0)}
        />
      </div>
      <div className="spread">
        <span className="small">
          Notional: <strong>{valid ? formatMoney(draftNotional) : '—'}</strong>
          {valid && draftNotional > riskLimit ? (
            <>
              {' '}
              <Badge tone="warn">above limit</Badge>
            </>
          ) : null}
        </span>
        <Button variant="primary" onClick={placeOrder} disabled={!valid}>
          Place order
        </Button>
      </div>
      <p role="status" className="small esp-status">
        {status}
      </p>
      <ValueTable
        label="Ticket store"
        rows={{
          'Working orders': ticket.working.map((order) => order.orderId).join(', ') || 'none',
          Filled: ticket.filled,
          'Rejected (preview filter)': rejected.length,
        }}
      />
      {rejected.length > 0 ? (
        <ul className="esp-rejections" aria-label="Rejected orders">
          {rejected.map((entry) => (
            <li key={entry.order.orderId}>
              {entry.order.orderId}: {entry.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

// ---- Trade blotter ---------------------------------------------------------------

function TradeBlotter({ trace }: { trace: Trace }) {
  const [blotter, , esp] = useEspReducer<BlotterState, BlotterAction>(
    blotterReducer,
    initialBlotter,
    {
      modelName: 'trade-blotter',
      observedEvents: [ORDER_FILLED, TRADE_BUSTED],
      onStage: (info) => trace('Blotter', info),
    },
  );

  return (
    <Panel title="Trade blotter" description={`Store: ${esp.modelId}`}>
      {blotter.trades.length === 0 ? (
        <p className="muted">No trades yet. Accepted orders fill after a short delay.</p>
      ) : (
        <div className="esp-table-wrap" role="region" aria-label="Trades" tabIndex={0}>
          <table className="esp-table">
            <thead>
              <tr>
                <th scope="col">Trade</th>
                <th scope="col">Order</th>
                <th scope="col">Symbol</th>
                <th scope="col">Side</th>
                <th scope="col">Qty</th>
                <th scope="col">Price</th>
                <th scope="col">Notional</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {blotter.trades.map((trade) => (
                <tr key={trade.tradeId} className={trade.busted ? 'esp-busted' : undefined}>
                  <th scope="row">{trade.tradeId}</th>
                  <td>{trade.orderId}</td>
                  <td>{trade.symbol}</td>
                  <td>{trade.side}</td>
                  <td>{trade.quantity}</td>
                  <td>{trade.price.toFixed(2)}</td>
                  <td>{formatMoney(notional(trade))}</td>
                  <td>
                    {trade.busted ? (
                      <Badge tone="warn">busted</Badge>
                    ) : (
                      <Badge tone="success">filled</Badge>
                    )}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={trade.busted}
                      onClick={() => {
                        // Strip UI-only fields: the event carries the fill itself.
                        const { busted: _busted, ...fill } = trade;
                        esp.broadcast(TRADE_BUSTED, fill);
                      }}
                    >
                      Bust <span className="visually-hidden">{trade.tradeId}</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ---- Position summary ------------------------------------------------------------

function PositionSummary({ trace }: { trace: Trace }) {
  const [positions, , esp] = useEspReducer<PositionsState, PositionsAction>(
    positionsReducer,
    initialPositions,
    {
      modelName: 'positions',
      observedEvents: [ORDER_FILLED, TRADE_BUSTED],
      onStage: (info) => trace('Positions', info),
    },
  );
  const rows = Object.values(positions.bySymbol);
  const totals = positionTotals(positions);

  return (
    <Panel title="Position summary" description={`Store: ${esp.modelId}`}>
      {rows.length === 0 ? (
        <p className="muted">Flat: no positions.</p>
      ) : (
        <table className="esp-table" aria-label="Positions">
          <thead>
            <tr>
              <th scope="col">Symbol</th>
              <th scope="col">Net qty</th>
              <th scope="col">Cash</th>
              <th scope="col">Trades</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((position) => (
              <tr key={position.symbol}>
                <th scope="row">{position.symbol}</th>
                <td>{position.netQuantity}</td>
                <td>{formatMoney(position.cash)}</td>
                <td>{position.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ValueTable
        label="Totals"
        rows={{
          'Gross quantity': totals.grossQuantity,
          'Net cash': formatMoney(totals.cash),
        }}
      />
    </Panel>
  );
}
