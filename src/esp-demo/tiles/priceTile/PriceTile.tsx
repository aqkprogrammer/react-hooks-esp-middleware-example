import * as React from "react";
import { useCallback, useContext } from "react";
import cn from "classnames";
import useFormField from "../../common/hooks/useFormField";
import { WorkspaceContext } from "../../context/context";
import { PriceContext } from "./context/context";
import "./styles.css";

export function PriceTile() {
  const { state: workspaceState } = useContext(WorkspaceContext);
  const { state, actions } = useContext(PriceContext);
  const loggedIn = !!workspaceState.userToken;
  const { clickCount, prices, priceInput } = state;
  const priceKeys = Object.keys(prices);

  const form = {
    price: useFormField(priceInput, value => {
      actions.typingPrice(value);
    })
  };

  const onSubscribePrice = useCallback(
    event => {
      event && event.preventDefault();
      actions.subscribe(priceInput);
    },
    [actions, priceInput]
  );

  const onUnSubscribePrice = useCallback(pair => actions.unsubscribe(pair), [
    actions
  ]);

  const onUnSubscribeAllPrices = useCallback(
    event => {
      event && event.preventDefault();
      actions.unsubscribeAllPrices();
    },
    [actions]
  );

  const onClickCountPressed = useCallback(
    event => {
      event && event.preventDefault();
      actions.clicked();
    },
    [actions]
  );

  const tileClassName = cn("priceTile", workspaceState.themeClassName, {
    loggedIn
  });

  return (
    <div className={tileClassName}>
      <h1>Price Tile {loggedIn && <span>Logged In</span>}</h1>
      <form className="priceForm">
        <fieldset>
          <input name="priceInput" {...form.price.bind} />
          <button type="submit" onClick={onSubscribePrice}>
            Add Pair
          </button>
          {!!priceKeys.length && (
            <button onClick={onUnSubscribeAllPrices}>Unsubscribe All</button>
          )}
        </fieldset>
        <fieldset>
          <span>Click Count: {clickCount}</span>
          <button onClick={onClickCountPressed}>Click</button>
        </fieldset>
      </form>
      <section className="priceList">
        <ul>
          {priceKeys.map((key: string, idx: number) => (
            <PriceTicker
              key={key}
              symbol={key}
              price={prices[key]}
              onDelete={onUnSubscribePrice}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

interface PriceTickerProps {
  symbol: string;
  price: number;
  onDelete: (key: string) => void;
}
const PriceTicker = React.memo(
  ({ symbol, price, onDelete }: PriceTickerProps) => {
    const callback = useCallback(() => onDelete(symbol), [symbol, onDelete]);
    return (
      <li className="priceTicker">
        <span>{symbol}</span>
        <span>{price}</span>
        <button onClick={callback}>Unsubscribe</button>
      </li>
    );
  }
);
