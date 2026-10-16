import { Router } from 'esp-js';
import { useState } from 'react';
import { Callout } from '../../../components/ui';
import { EspRouterProvider } from '../../../middleware/esp-js';
import { TradingDesk } from './TradingDesk';
import './EspBlotterScenario.css';

/**
 * A trading desk on the project's esp-js middleware: order ticket, trade
 * blotter and position summary are three independent stores on one router.
 */
export default function EspBlotterScenario() {
  // A fresh router per scenario instance: never share the workspace router
  // with a demo (or a test) — models from elsewhere would receive these events.
  const [router] = useState(() => new Router());
  return (
    <EspRouterProvider router={router}>
      <div className="stack">
        <Callout title="Try it">
          Place an order: the ticket publishes <code>ORDER_SUBMITTED</code> to its own model, where
          a preview-stage filter applies the risk limit. Accepted orders are filled by a simulated
          exchange, which broadcasts <code>ORDER_FILLED</code> to every store. Bust a trade in the
          blotter to broadcast <code>TRADE_BUSTED</code> and watch the position reverse. Raise the
          quantity above the risk limit to see the event cancelled at preview.
        </Callout>
        <TradingDesk />
      </div>
    </EspRouterProvider>
  );
}
