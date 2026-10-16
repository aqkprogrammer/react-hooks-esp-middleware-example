import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SHOP_STORAGE_KEY } from './shopStore';
import ZustandDemo from './ZustandDemo';

const commits = (label: string) =>
  Number(screen.getByText(`${label} commits:`).querySelector('span')?.textContent?.split(' ')[0]);
const total = (row: string) =>
  within(screen.getByLabelText('Totals')).getByText(row).nextElementSibling;

describe('ZustandDemo', () => {
  it('updates selected slices and leaves action-only components alone', async () => {
    const user = userEvent.setup();
    render(<ZustandDemo />);
    const productsBefore = commits('Products');
    await user.click(screen.getByRole('button', { name: 'Add Notebook' }));
    await user.click(screen.getByRole('button', { name: 'Add Notebook' }));
    await user.click(screen.getByRole('button', { name: 'Add Pen' }));
    expect(
      within(screen.getByRole('list', { name: 'Cart lines' })).getByText('Notebook × 2'),
    ).toBeInTheDocument();
    expect(total('Items')).toHaveTextContent('3');
    expect(total('Subtotal')).toHaveTextContent('$10.25');
    expect(commits('Products')).toBe(productsBefore);

    await user.click(screen.getByRole('button', { name: 'Remove one Notebook' }));
    expect(total('Items')).toHaveTextContent('2');
  });

  it('applies coupons and rejects unknown codes', async () => {
    const user = userEvent.setup();
    render(<ZustandDemo />);
    await user.click(screen.getByRole('button', { name: 'Add Desk lamp' }));
    await user.type(screen.getByLabelText('Coupon code'), 'nope{Enter}');
    expect(screen.getByText('"nope" is not a valid coupon.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Coupon code'));
    await user.type(screen.getByLabelText('Coupon code'), 'save10{Enter}');
    expect(total('Total')).toHaveTextContent('$17.99');
  });

  it('persists data (not actions) and rehydrates a new store', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ZustandDemo />);
    await user.click(screen.getByRole('button', { name: 'Add Pen' }));
    const stored = JSON.parse(window.localStorage.getItem(SHOP_STORAGE_KEY) ?? 'null');
    expect(stored).toEqual({
      state: { lines: [{ id: 2, name: 'Pen', price: 1.25, qty: 1 }], coupon: null },
      version: 1,
    });
    unmount();
    render(<ZustandDemo />);
    expect(total('Items')).toHaveTextContent('1');
    await user.click(screen.getByRole('button', { name: 'Clear cart' }));
    expect(total('Items')).toHaveTextContent('0');
  });
});
