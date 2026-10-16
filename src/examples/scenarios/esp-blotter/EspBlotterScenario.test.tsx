import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'esp-js';
import { describe, expect, it, vi } from 'vitest';
import { EspRouterProvider } from '../../../middleware/esp-js';
import EspBlotterScenario from './EspBlotterScenario';
import { createSimulatedExchange } from './simulatedExchange';
import {
  ORDER_FILLED,
  ORDER_SUBMITTED,
  TRADE_BUSTED,
  blotterReducer,
  initialBlotter,
  initialPositions,
  initialTicket,
  positionsReducer,
  ticketReducer,
  type Fill,
} from './trading';
import { TradingDesk } from './TradingDesk';

const fill: Fill = {
  orderId: 'O1',
  tradeId: 'T1',
  symbol: 'ACME',
  side: 'buy',
  quantity: 10,
  price: 5,
  filledAt: 0,
};

/** The fill delay must outlast user-event's own async steps for "waiting" assertions. */
function renderDesk(fillDelayMs = 150) {
  const router = new Router();
  const utils = render(
    <EspRouterProvider router={router}>
      <TradingDesk fillDelayMs={fillDelayMs} />
    </EspRouterProvider>,
  );
  return { router, ...utils };
}

const status = () => screen.getByRole('status');
const inspector = () => screen.getByRole('log', { name: 'Router events' });
const valueOf = (term: string) => screen.getByText(term).nextSibling?.textContent;

async function setNumber(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
}

describe('trading reducers', () => {
  it('tracks working orders on the ticket', () => {
    const order = { orderId: 'O1', symbol: 'ACME', side: 'buy' as const, quantity: 10, price: 5 };
    const working = ticketReducer(initialTicket, { type: ORDER_SUBMITTED, payload: order });
    expect(working.working).toHaveLength(1);
    const filled = ticketReducer(working, { type: ORDER_FILLED, payload: fill });
    expect(filled).toEqual({ working: [], filled: 1 });
    // A fill for an unknown order changes nothing.
    expect(ticketReducer(filled, { type: ORDER_FILLED, payload: fill })).toBe(filled);
  });

  it('keeps the blotter and positions idempotent', () => {
    const once = blotterReducer(initialBlotter, { type: ORDER_FILLED, payload: fill });
    expect(blotterReducer(once, { type: ORDER_FILLED, payload: fill })).toBe(once);
    expect(blotterReducer(once, { type: TRADE_BUSTED, payload: fill }).trades[0]?.busted).toBe(
      true,
    );

    const long = positionsReducer(initialPositions, { type: ORDER_FILLED, payload: fill });
    expect(long.bySymbol.ACME).toEqual({ symbol: 'ACME', netQuantity: 10, cash: -50, trades: 1 });
    expect(positionsReducer(long, { type: ORDER_FILLED, payload: fill })).toBe(long);
    const flat = positionsReducer(long, { type: TRADE_BUSTED, payload: fill });
    expect(flat.bySymbol.ACME).toEqual({ symbol: 'ACME', netQuantity: 0, cash: 0, trades: 0 });
    expect(positionsReducer(flat, { type: TRADE_BUSTED, payload: fill })).toBe(flat);
  });

  it('cancels pending fills on dispose', () => {
    vi.useFakeTimers();
    const exchange = createSimulatedExchange(100);
    const dispatch = vi.fn();
    const next = vi.fn();
    const order = { orderId: 'O1', symbol: 'ACME', side: 'buy' as const, quantity: 1, price: 1 };
    exchange.middleware({ getState: () => initialTicket, dispatch })(next)({
      type: ORDER_SUBMITTED,
      payload: order,
    });
    expect(next).toHaveBeenCalled();
    expect(exchange.pending()).toBe(1);
    exchange.dispose();
    vi.advanceTimersByTime(200);
    expect(dispatch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('TradingDesk', () => {
  it('fills an accepted order and updates all three stores', async () => {
    const user = userEvent.setup();
    renderDesk();
    await user.click(screen.getByRole('button', { name: 'Place order' }));
    expect(status()).toHaveTextContent('Order O1 accepted — waiting for a fill.');
    expect(valueOf('Working orders')).toBe('O1');
    expect(inspector()).toHaveTextContent('Ticket · ORDER_SUBMITTED · committed');

    await waitFor(() => expect(status()).toHaveTextContent('Order O1 filled.'));
    const trades = within(screen.getByRole('region', { name: 'Trades' }));
    expect(trades.getByRole('rowheader', { name: 'T1' })).toBeInTheDocument();
    const positions = within(screen.getByRole('table', { name: 'Positions' }));
    const acme = within(positions.getByRole('row', { name: /ACME/ })).getAllByRole('cell');
    expect(acme.map((cell) => cell.textContent)).toEqual(['100', '-$18,250.00', '1']);
    expect(valueOf('Filled')).toBe('1');
    expect(inspector()).toHaveTextContent('Blotter · ORDER_FILLED · final');
    expect(inspector()).toHaveTextContent('Positions · ORDER_FILLED · final');
  });

  it('rejects orders above the risk limit at the preview stage', async () => {
    const user = userEvent.setup();
    renderDesk();
    await setNumber(user, 'Quantity', '1000');
    expect(screen.getByText('above limit')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Place order' }));
    expect(status()).toHaveTextContent(
      'Order O1 rejected: Notional $182,500.00 exceeds the $50,000.00 risk limit.',
    );
    expect(screen.getByRole('list', { name: 'Rejected orders' })).toHaveTextContent('O1');
    expect(inspector()).toHaveTextContent('Ticket · ORDER_SUBMITTED · canceled');
    expect(inspector()).not.toHaveTextContent('ORDER_SUBMITTED · final');
    expect(valueOf('Working orders')).toBe('none');

    // The filter reads the latest limit without re-registering the model.
    await setNumber(user, 'Risk limit (max notional)', '200000');
    await user.click(screen.getByRole('button', { name: 'Place order' }));
    expect(status()).toHaveTextContent('Order O2 accepted');
    await waitFor(() => expect(status()).toHaveTextContent('Order O2 filled.'));
  });

  it('busts a trade: the blotter broadcasts and the position reverses', async () => {
    const user = userEvent.setup();
    renderDesk();
    await user.click(screen.getByRole('radio', { name: 'Sell' }));
    await user.click(screen.getByRole('button', { name: 'Place order' }));
    const bust = await screen.findByRole('button', { name: 'Bust T1' });
    expect(screen.getByRole('table', { name: 'Positions' })).toHaveTextContent('-100');
    await user.click(bust);
    expect(bust).toBeDisabled();
    expect(
      within(screen.getByRole('region', { name: 'Trades' })).getByText('busted'),
    ).toBeInTheDocument();
    const acme = within(
      within(screen.getByRole('table', { name: 'Positions' })).getByRole('row', { name: /ACME/ }),
    ).getAllByRole('cell');
    expect(acme.map((cell) => cell.textContent)).toEqual(['0', '$0.00', '0']);
    expect(inspector()).toHaveTextContent('Positions · TRADE_BUSTED · final');
  });

  it('shows lifecycle stages on request', async () => {
    const user = userEvent.setup();
    renderDesk();
    await user.click(screen.getByRole('checkbox', { name: /lifecycle/ }));
    await user.click(screen.getByRole('button', { name: 'Place order' }));
    expect(inspector()).toHaveTextContent('Ticket · (dispatch loop) · preProcess');
    expect(inspector()).toHaveTextContent('Ticket · ORDER_SUBMITTED · postProcess');
  });

  it('removes its models and cancels pending fills on unmount', async () => {
    const user = userEvent.setup();
    const error = vi.spyOn(console, 'error');
    const { router, unmount } = renderDesk();
    await user.click(screen.getByRole('button', { name: 'Place order' }));
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(error).not.toHaveBeenCalled();
    expect(router.isModelRegistered('positions')).toBe(false);
  });
});

describe('EspBlotterScenario', () => {
  it('gives every instance its own router', async () => {
    const user = userEvent.setup();
    render(
      <>
        <EspBlotterScenario />
        <EspBlotterScenario />
      </>,
    );
    const [first] = screen.getAllByRole('button', { name: 'Place order' });
    await user.click(first!);
    const [firstLog, secondLog] = screen.getAllByRole('log', { name: 'Router events' });
    expect(firstLog).toHaveTextContent('ORDER_SUBMITTED');
    expect(secondLog).toHaveTextContent('Nothing logged yet.');
  });
});
