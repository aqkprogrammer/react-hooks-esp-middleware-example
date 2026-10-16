import cn from 'classnames';
import { memo, useCallback, type FormEvent } from 'react';
import useFormField from '../../common/hooks/useFormField';
import { useWorkspace } from '../../context/context';
import { usePriceTile } from './context/context';
import './styles.css';

export function PriceTile() {
  const { state: workspaceState } = useWorkspace();
  const { state, actions } = usePriceTile();
  const loggedIn = !!workspaceState.userToken;
  const { clickCount, prices, priceInput, lastEspEvents, lastKeyEvent, error } = state;
  const priceKeys = Object.keys(prices);

  const form = {
    price: useFormField(priceInput, (value) => {
      actions.typingPrice(value);
    }),
  };

  const onSubscribePrice = (event: FormEvent) => {
    event.preventDefault();
    const pair = priceInput.trim().toLowerCase();
    if (pair) actions.subscribe(pair);
  };

  // Stable callback so memoised <PriceTicker> rows only re-render when their own price changes.
  const { unsubscribe } = actions;
  const onUnSubscribePrice = useCallback((pair: string) => unsubscribe(pair), [unsubscribe]);

  const tileClassName = cn('priceTile', workspaceState.themeClassName, { loggedIn });

  return (
    <article className={tileClassName} aria-labelledby="price-tile-title">
      <h3 id="price-tile-title">Price Tile {loggedIn && <span>Logged In</span>}</h3>
      <form className="priceForm" onSubmit={onSubscribePrice}>
        <fieldset>
          <label htmlFor="price-input">Currency pair</label>{' '}
          <input id="price-input" name="priceInput" {...form.price.bind} />
          <button type="submit" disabled={!priceInput.trim()}>
            Add Pair
          </button>
          {!!priceKeys.length && (
            <button type="button" onClick={actions.unsubscribeAllPrices}>
              Unsubscribe All
            </button>
          )}
        </fieldset>
        <fieldset>
          <span>Click Count: {clickCount}</span>
          <button type="button" onClick={actions.clicked}>
            Click
          </button>
        </fieldset>
      </form>
      <section className="priceList" aria-label="Subscribed prices">
        {priceKeys.length === 0 ? (
          <p>No subscriptions. Prices tick every 2 s (simulated).</p>
        ) : null}
        <ul>
          {priceKeys.map((key) => (
            <PriceTicker
              key={key}
              symbol={key}
              price={prices[key] ?? 0}
              onDelete={onUnSubscribePrice}
            />
          ))}
        </ul>
      </section>
      <section className="priceFooter" aria-label="ESP events received">
        <p>
          Last KEY_PRESSED received via esp-js: <strong>{lastKeyEvent ?? 'none yet'}</strong>
        </p>
        <p>
          Last dispatch loop (postProcess): <code>{lastEspEvents.join(', ') || '—'}</code>
        </p>
        {error ? <p role="alert">Stream error: {error}</p> : null}
      </section>
    </article>
  );
}

interface PriceTickerProps {
  symbol: string;
  price: number;
  onDelete: (key: string) => void;
}

const PriceTicker = memo(function PriceTicker({ symbol, price, onDelete }: PriceTickerProps) {
  return (
    <li className="priceTicker">
      <span>{symbol}</span>
      <span className="mono">{price.toFixed(4)}</span>
      <button type="button" onClick={() => onDelete(symbol)}>
        Unsubscribe <span className="visually-hidden">{symbol}</span>
      </button>
    </li>
  );
});
