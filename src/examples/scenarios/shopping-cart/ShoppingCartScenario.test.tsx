import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  cartReducer,
  EMPTY_CART,
  getCartTotals,
  isCartState,
  MAX_QUANTITY,
  type CartState,
} from './cart';
import ShoppingCartScenario from './ShoppingCartScenario';
import { CART_STORAGE_KEY } from './useCart';

const summaryValue = (term: string | RegExp) =>
  within(screen.getByLabelText('Order summary')).getByText(term).nextElementSibling?.textContent;
const stored = () => JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? 'null') as unknown;

const kettleCart: CartState = {
  lines: [{ productId: 'kettle', name: 'Quiet Kettle', unitPriceCents: 34_99, quantity: 2 }],
};

describe('ShoppingCartScenario', () => {
  it('adds products and derives the totals', async () => {
    const user = userEvent.setup();
    render(<ShoppingCartScenario />);
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Quiet Kettle to cart' }));
    await user.click(screen.getByRole('button', { name: 'Add Quiet Kettle to cart' }));
    await user.click(screen.getByRole('button', { name: 'Add Tidy Notebook to cart' }));

    expect(screen.getByRole('heading', { name: 'Cart (3 items)' })).toBeInTheDocument();
    expect(summaryValue('Subtotal')).toBe('$74.48');
    expect(summaryValue('Shipping')).toBe('$5.99');
    expect(summaryValue(/Tax/)).toBe('$5.96');
    expect(summaryValue('Total')).toBe('$86.43');
    expect(screen.getByText('Add $0.52 more for free shipping.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Added Tidy Notebook to the cart.');
    expect(stored()).toEqual({
      lines: [
        { productId: 'kettle', name: 'Quiet Kettle', unitPriceCents: 3499, quantity: 2 },
        { productId: 'notebook', name: 'Tidy Notebook', unitPriceCents: 450, quantity: 1 },
      ],
    });
  });

  it('changes quantities with the buttons and removes lines', async () => {
    const user = userEvent.setup();
    render(<ShoppingCartScenario />);
    await user.click(screen.getByRole('button', { name: 'Add Jolly Puzzle to cart' }));
    const decrease = screen.getByRole('button', { name: 'Decrease quantity of Jolly Puzzle' });
    expect(decrease).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Increase quantity of Jolly Puzzle' }));
    expect(screen.getByLabelText('Quantity of Jolly Puzzle')).toHaveValue(2);
    await user.click(decrease);
    expect(screen.getByLabelText('Quantity of Jolly Puzzle')).toHaveValue(1);

    await user.click(screen.getByRole('button', { name: 'Remove Jolly Puzzle' }));
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(summaryValue('Shipping')).toBe('—');
  });

  it('commits typed quantities on Enter/blur, clamps them and treats 0 as remove', async () => {
    const user = userEvent.setup();
    render(<ShoppingCartScenario />);
    await user.click(screen.getByRole('button', { name: 'Add Warm Planter to cart' }));
    const input = screen.getByLabelText('Quantity of Warm Planter');

    await user.clear(input);
    await user.type(input, '50{Enter}');
    expect(input).toHaveValue(MAX_QUANTITY);
    expect(screen.getByRole('button', { name: 'Add Warm Planter to cart' })).toBeDisabled();

    await user.clear(input);
    await user.type(input, '3');
    expect(stored()).toMatchObject({ lines: [{ quantity: MAX_QUANTITY }] });
    await user.tab();
    expect(input).toHaveValue(3);

    await user.clear(input);
    await user.type(input, '0');
    await user.tab();
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('gives free shipping above the threshold and formats per locale', async () => {
    const user = userEvent.setup();
    render(<ShoppingCartScenario />);
    await user.click(screen.getByRole('button', { name: 'Add Bright Lamp to cart' }));
    expect(summaryValue('Shipping')).toBe('Free');
    expect(summaryValue('Subtotal')).toBe('$1,249.95');

    await user.selectOptions(screen.getByLabelText('Number format'), 'de-DE');
    expect(summaryValue('Subtotal')).toMatch(/^1\.249,95\s\$$/);
  });

  it('restores a saved cart and follows writes from other tabs', () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(kettleCart));
    render(<ShoppingCartScenario />);
    expect(screen.getByRole('heading', { name: 'Cart (2 items)' })).toBeInTheDocument();

    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ lines: [{ ...kettleCart.lines[0], quantity: 5 }] }),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY }));
    });
    expect(screen.getByRole('heading', { name: 'Cart (5 items)' })).toBeInTheDocument();
  });

  it('ignores invalid stored data and says so', async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ lines: [{ productId: 'kettle', quantity: -3 }] }),
    );
    render(<ShoppingCartScenario />);
    expect(await screen.findByText('Saved cart was unreadable')).toBeInTheDocument();
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });
});

describe('cart domain', () => {
  const product = { id: 'p', name: 'P', priceCents: 1_00 };

  it('caps quantities and ignores invalid input', () => {
    let state = EMPTY_CART;
    for (let i = 0; i < MAX_QUANTITY + 3; i += 1)
      state = cartReducer(state, { type: 'add', product });
    expect(state.lines[0]?.quantity).toBe(MAX_QUANTITY);
    expect(cartReducer(state, { type: 'setQuantity', productId: 'p', quantity: Number.NaN })).toBe(
      state,
    );
    expect(
      cartReducer(state, { type: 'setQuantity', productId: 'p', quantity: 2.7 }).lines[0],
    ).toMatchObject({ quantity: 2 });
  });

  it('validates persisted carts strictly', () => {
    expect(isCartState(kettleCart)).toBe(true);
    expect(isCartState({ lines: [...kettleCart.lines, ...kettleCart.lines] })).toBe(false);
    expect(isCartState({ lines: [{ ...kettleCart.lines[0], unitPriceCents: 1.5 }] })).toBe(false);
    expect(isCartState('[]')).toBe(false);
  });

  it('rounds tax once on the subtotal', () => {
    const totals = getCartTotals({
      lines: [{ productId: 'a', name: 'A', unitPriceCents: 1_99, quantity: 3 }],
    });
    expect(totals).toMatchObject({ subtotalCents: 597, taxCents: 48, shippingCents: 599 });
    expect(totals.totalCents).toBe(597 + 48 + 599);
  });
});
