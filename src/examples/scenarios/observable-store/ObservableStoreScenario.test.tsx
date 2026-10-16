import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { firstValueFrom, toArray, take } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import ObservableStoreScenario from './ObservableStoreScenario';
import { createShop, selectSummary, selectTotal, toObservable } from './shopStore';

/** Reads the commit count rendered by <RenderCount label={label}>. */
function commits(label: string): number {
  const element = Array.from(document.querySelectorAll('.render-count-label')).find((node) =>
    node.textContent?.startsWith(`${label} commits:`),
  );
  const match = element?.textContent?.match(/commits: (\d+)/);
  if (!match?.[1]) throw new Error(`No render count for ${label}`);
  return Number(match[1]);
}

const LABELS = [
  'User badge',
  'Cart count',
  'Summary',
  'Whole state',
  'Line count',
  'Total trend',
  'Cart lines',
];
const snapshot = () => Object.fromEntries(LABELS.map((label) => [label, commits(label)]));

describe('shop store', () => {
  it('updates slices, skips no-op updates and exposes an observable', async () => {
    const { store, actions } = createShop();
    const listener = vi.fn();
    store.subscribe(listener);
    actions.addItem();
    actions.addItem();
    actions.addItem();
    expect(listener).toHaveBeenCalledTimes(3);
    actions.addItem(); // catalogue exhausted → returns the same state → no notification
    expect(listener).toHaveBeenCalledTimes(3);
    actions.checkout();
    expect(listener).toHaveBeenCalledTimes(4);
    expect(selectSummary(store.getState())).toEqual({ count: 0, total: 0 });

    actions.reset();
    const totals = firstValueFrom(toObservable(store).pipe(take(2), toArray()));
    actions.toggleDiscount();
    expect((await totals).map(selectTotal)).toEqual([167, 150.3]);
  });
});

describe('ObservableStoreScenario', () => {
  it('re-renders only the components whose selected slice changed', async () => {
    const user = userEvent.setup();
    render(<ObservableStoreScenario />);
    const before = snapshot();
    expect(Object.values(before).every((count) => count === 1)).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Rename user' }));
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(snapshot()).toEqual({
      ...before,
      'User badge': 2,
      'Whole state': 2, // no selector: renders on every change
    });

    await user.click(screen.getByRole('button', { name: 'Add item' }));
    const afterAdd = snapshot();
    expect(afterAdd['User badge']).toBe(2);
    expect(afterAdd['Cart count']).toBe(2);
    expect(afterAdd['Cart lines']).toBe(2);
    expect(afterAdd['Line count']).toBe(2);
    expect(afterAdd.Summary).toBe(2);
    expect(screen.getByText('Total changed from $167.00 to $416.00')).toBeInTheDocument();
  });

  it('needs shallow equality when a selector returns a new object', async () => {
    const user = userEvent.setup();
    render(<ObservableStoreScenario />);
    await user.click(screen.getByRole('button', { name: 'Rename user' }));
    expect(commits('Summary')).toBe(1);

    await user.click(screen.getByRole('checkbox', { name: /shallowEqualObjects/ }));
    const afterToggle = commits('Summary'); // the prop change itself renders once
    await user.click(screen.getByRole('button', { name: 'Rename user' }));
    expect(commits('Summary')).toBe(afterToggle + 1);
    expect(commits('Cart count')).toBe(1);
  });

  it('edits cart lines and handles the empty cart', async () => {
    const user = userEvent.setup();
    render(<ObservableStoreScenario />);
    await user.click(screen.getByRole('button', { name: '+1 Mouse' }));
    expect(screen.getByText('Items in cart:').textContent).toBe('Items in cart: 4');
    expect(commits('User badge')).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Checkout (clears cart + discount)' }));
    expect(screen.getByText('The cart is empty.')).toBeInTheDocument();
    expect(screen.getByText(/Distinct products/)).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: 'Reset store' }));
    expect(screen.getByRole('list', { name: 'Cart lines' })).toBeInTheDocument();
  });
});
