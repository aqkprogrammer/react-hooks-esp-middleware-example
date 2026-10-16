import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cartActions, cartStore, createStore } from './cartStore';
import UseSyncExternalStoreDemo from './UseSyncExternalStoreDemo';

const commits = (label: string) => {
  const text = screen.getByText(new RegExp(`^${label} commits:`)).textContent ?? '';
  return Number(/commits: (\d+)/.exec(text)?.[1]);
};
const listItems = () =>
  within(screen.getByRole('list', { name: 'Cart items' }))
    .getAllByRole('listitem')
    .map((item) => item.firstChild?.textContent);

describe('createStore', () => {
  it('notifies subscribers only when the state changes and unsubscribes', () => {
    const store = createStore({ value: 1 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setState((state) => state);
    expect(listener).not.toHaveBeenCalled();
    store.setState(() => ({ value: 2 }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ value: 2 });
    unsubscribe();
    expect(store.listenerCount()).toBe(0);
  });
});

describe('UseSyncExternalStoreDemo', () => {
  beforeEach(() => {
    cartActions.reset();
  });

  it('shares one store across independent components', async () => {
    const user = userEvent.setup();
    render(<UseSyncExternalStoreDemo />);
    expect(listItems()).toEqual(['Apple × 1']);

    await user.click(screen.getByRole('button', { name: 'Add Bread' }));
    await user.click(screen.getByRole('button', { name: 'Add Apple' }));
    expect(listItems()).toEqual(['Apple × 2', 'Bread × 1']);
    expect(screen.getByText('Cart').textContent).toContain('3');

    await user.click(screen.getByRole('button', { name: 'Remove Apple' }));
    expect(listItems()).toEqual(['Bread × 1']);
  });

  it('re-renders only components whose selected slice changed', async () => {
    const user = userEvent.setup();
    render(<UseSyncExternalStoreDemo />);
    await user.click(screen.getByRole('button', { name: 'Add Bread' }));
    expect(commits('List')).toBe(2);
    expect(commits('Badge')).toBe(2);
    expect(commits('Coupon')).toBe(1);

    await user.type(screen.getByLabelText('Coupon code'), 'SAVE10');
    const typingCommits = commits('Coupon');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByLabelText('Applied coupon')).toHaveTextContent('SAVE10');
    expect(commits('Coupon')).toBe(typingCommits + 1);
    expect(commits('List')).toBe(2);
    expect(commits('Badge')).toBe(2);
  });

  it('does not re-render after an in-place mutation', async () => {
    const user = userEvent.setup();
    render(<UseSyncExternalStoreDemo />);
    await user.click(screen.getByRole('button', { name: 'Push into items and notify (bug)' }));
    expect(listItems()).toEqual(['Apple × 1']);
    expect(commits('List')).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Add Cheese' }));
    expect(listItems()).toEqual(['Apple × 1', 'Mutated item × 1', 'Cheese × 1']);
  });

  it('unsubscribes every component on unmount', () => {
    const { unmount } = render(<UseSyncExternalStoreDemo />);
    expect(cartStore.listenerCount()).toBeGreaterThan(0);
    unmount();
    expect(cartStore.listenerCount()).toBe(0);
  });
});
