import { useId, useState } from 'react';
import { Button, Callout, Panel } from '../../components/ui';

type Currency = 'EUR' | 'USD' | 'GBP';
type Plan = 'monthly' | 'yearly';

const prices: Record<Plan, number> = { monthly: 12, yearly: 120 };

/**
 * Corrected version of broken/SetStateDuringRender.tsx:
 * - the formatted price is *derived* during render instead of copied into state;
 * - handlers are passed as functions (`onClick={() => …}`), not called;
 * - resetting the selection when the `currency` prop changes uses React's
 *   documented "store the previous value" pattern — a *guarded* setState
 *   during render that runs once per change, never in a loop.
 */
export default function SetStateInRenderDemo() {
  const [currency, setCurrency] = useState<Currency>('EUR');
  const currencyId = useId();
  return (
    <div className="stack">
      <Panel title="Pricing">
        <div className="row">
          <label htmlFor={currencyId}>Currency</label>
          <select
            id={currencyId}
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        <PlanPicker currency={currency} />
      </Panel>
      <Callout title="Prefer a key when you can">
        <code>&lt;PlanPicker key={'{currency}'} /&gt;</code> resets <em>all</em> of its state on a
        currency change without any code inside the component.
      </Callout>
    </div>
  );
}

function PlanPicker({ currency }: { currency: Currency }) {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [previousCurrency, setPreviousCurrency] = useState(currency);
  if (previousCurrency !== currency) {
    // ✅ Guarded: runs once per currency change, then the condition is false.
    setPreviousCurrency(currency);
    setSelected(null);
  }

  // ✅ Derived during render — no state, no effect.
  const format = new Intl.NumberFormat('en', { style: 'currency', currency });

  return (
    <div className="stack">
      <div className="row" role="group" aria-label="Plans">
        {(Object.keys(prices) as Plan[]).map((plan) => (
          <Button
            key={plan}
            aria-pressed={selected === plan}
            variant={selected === plan ? 'primary' : 'secondary'}
            onClick={() => setSelected(plan)}
          >
            {plan}: {format.format(prices[plan])}
          </Button>
        ))}
      </div>
      <p role="status">
        {selected ? `Selected the ${selected} plan in ${currency}.` : 'No plan selected.'}
      </p>
    </div>
  );
}
