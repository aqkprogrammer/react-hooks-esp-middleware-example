import { useId, useMemo, useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import type { StorageError } from '../../../hooks';
import { MAX_QUANTITY, TAX_RATE, type CartLine, type CartProduct } from './cart';
import { useCart } from './useCart';
import './ShoppingCartScenario.css';

const PRODUCTS: readonly CartProduct[] = [
  { id: 'kettle', name: 'Quiet Kettle', priceCents: 34_99 },
  { id: 'headphones', name: 'Nimble Headphones', priceCents: 129_00 },
  { id: 'notebook', name: 'Tidy Notebook', priceCents: 4_50 },
  { id: 'planter', name: 'Warm Planter', priceCents: 18_25 },
  { id: 'puzzle', name: 'Jolly Puzzle', priceCents: 22_00 },
  { id: 'lamp', name: 'Bright Lamp', priceCents: 1_249_95 },
];

const LOCALES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'ja-JP', label: '日本語 (日本)' },
] as const;

/**
 * A cart whose state is a pure reducer over localStorage (see `useCart`):
 * add/remove/quantity actions, totals derived during render, prices in
 * integer cents formatted with Intl.NumberFormat. Reload the page or open a
 * second tab — the cart follows.
 */
export default function ShoppingCartScenario() {
  const localeId = useId();
  const [locale, setLocale] = useState<string>('en-US');
  const [storageError, setStorageError] = useState<StorageError | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const { cart, totals, dispatch } = useCart(setStorageError);

  const money = useMemo(() => {
    const format = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
    return (cents: number) => format.format(cents / 100);
  }, [locale]);

  const quantityOf = (productId: string) =>
    cart.lines.find((line) => line.productId === productId)?.quantity ?? 0;

  return (
    <div className="stack">
      <div className="field shopping-cart-locale">
        <label className="field-label" htmlFor={localeId}>
          Number format
        </label>
        <select id={localeId} value={locale} onChange={(event) => setLocale(event.target.value)}>
          {LOCALES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {storageError ? (
        <Callout
          tone="warn"
          title={
            storageError.kind === 'write' ? 'Could not save the cart' : 'Saved cart was unreadable'
          }
        >
          {storageError.kind === 'write'
            ? 'Storage is full or blocked; your last change was not saved.'
            : 'The stored cart failed validation, so an empty cart is shown instead.'}
        </Callout>
      ) : null}

      <div className="shopping-cart-layout">
        <Panel title="Products">
          <ul className="shopping-cart-products">
            {PRODUCTS.map((product) => {
              const inCart = quantityOf(product.id);
              return (
                <li key={product.id} className="card shopping-cart-product">
                  <span className="shopping-cart-product-name">{product.name}</span>
                  <span className="mono">{money(product.priceCents)}</span>
                  <div className="row">
                    <Button
                      size="sm"
                      variant="primary"
                      aria-label={`Add ${product.name} to cart`}
                      disabled={inCart >= MAX_QUANTITY}
                      onClick={() => {
                        dispatch({ type: 'add', product });
                        setAnnouncement(`Added ${product.name} to the cart.`);
                      }}
                    >
                      Add to cart
                    </Button>
                    {inCart > 0 ? <Badge tone="info">{inCart} in cart</Badge> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title={`Cart (${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'})`}>
          <p role="status" className="visually-hidden">
            {announcement}
          </p>
          {cart.lines.length === 0 ? (
            <p className="muted">Your cart is empty.</p>
          ) : (
            <ul className="shopping-cart-lines" aria-label="Cart items">
              {cart.lines.map((line) => (
                <CartLineRow
                  key={line.productId}
                  line={line}
                  money={money}
                  onQuantity={(quantity) => {
                    dispatch({ type: 'setQuantity', productId: line.productId, quantity });
                    setAnnouncement(
                      quantity <= 0
                        ? `Removed ${line.name}.`
                        : `${line.name} quantity ${Math.min(quantity, MAX_QUANTITY)}.`,
                    );
                  }}
                  onRemove={() => {
                    dispatch({ type: 'remove', productId: line.productId });
                    setAnnouncement(`Removed ${line.name}.`);
                  }}
                />
              ))}
            </ul>
          )}

          <dl className="shopping-cart-summary" aria-label="Order summary">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(totals.subtotalCents)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>
                {totals.itemCount === 0
                  ? '—'
                  : totals.shippingCents === 0
                    ? 'Free'
                    : money(totals.shippingCents)}
              </dd>
            </div>
            <div>
              <dt>Tax ({Math.round(TAX_RATE * 100)}%)</dt>
              <dd>{money(totals.taxCents)}</dd>
            </div>
            <div className="shopping-cart-total">
              <dt>Total</dt>
              <dd>{money(totals.totalCents)}</dd>
            </div>
          </dl>
          {totals.toFreeShippingCents > 0 ? (
            <p className="small muted">
              Add {money(totals.toFreeShippingCents)} more for free shipping.
            </p>
          ) : null}
          <div>
            <Button
              variant="danger"
              disabled={cart.lines.length === 0}
              onClick={() => {
                dispatch({ type: 'clear' });
                setAnnouncement('Cart cleared.');
              }}
            >
              Empty cart
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

interface CartLineRowProps {
  line: CartLine;
  money: (cents: number) => string;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}

function CartLineRow({ line, money, onQuantity, onRemove }: CartLineRowProps) {
  const inputId = useId();
  // `null` = not editing: show the stored quantity. While typing, keep the
  // raw text locally and commit it on blur / Enter.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed) && parsed !== line.quantity) onQuantity(parsed);
    setDraft(null);
  };

  return (
    <li className="shopping-cart-line">
      <span className="shopping-cart-line-name">{line.name}</span>
      <div className="row shopping-cart-quantity">
        <Button
          size="sm"
          aria-label={`Decrease quantity of ${line.name}`}
          disabled={line.quantity <= 1}
          onClick={() => onQuantity(line.quantity - 1)}
        >
          −
        </Button>
        <label htmlFor={inputId} className="visually-hidden">
          Quantity of {line.name}
        </label>
        <input
          id={inputId}
          className="input shopping-cart-quantity-input"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_QUANTITY}
          value={draft ?? String(line.quantity)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') setDraft(null);
          }}
        />
        <Button
          size="sm"
          aria-label={`Increase quantity of ${line.name}`}
          disabled={line.quantity >= MAX_QUANTITY}
          onClick={() => onQuantity(line.quantity + 1)}
        >
          +
        </Button>
      </div>
      <span className="mono shopping-cart-line-total">
        {money(line.unitPriceCents * line.quantity)}
      </span>
      <Button size="sm" variant="ghost" aria-label={`Remove ${line.name}`} onClick={onRemove}>
        Remove
      </Button>
    </li>
  );
}
