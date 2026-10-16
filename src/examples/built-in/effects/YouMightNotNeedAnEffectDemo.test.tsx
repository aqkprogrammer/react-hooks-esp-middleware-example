import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import YouMightNotNeedAnEffectDemo from './YouMightNotNeedAnEffectDemo';

const commits = (label: string) => {
  const text = screen.getByText(new RegExp(`^${label} commits:`)).textContent ?? '';
  return Number(/commits: (\d+)/.exec(text)?.[1]);
};

describe('YouMightNotNeedAnEffectDemo', () => {
  it('both filters show the same matches, but the effect version commits twice as often', async () => {
    const user = userEvent.setup();
    render(<YouMightNotNeedAnEffectDemo />);
    await user.type(screen.getByLabelText('Filter (effect)'), 'jav');
    await user.type(screen.getByLabelText('Filter (derived)'), 'jav');

    expect(screen.getAllByText(/^2 matches: Java, JavaScript/)).toHaveLength(2);
    // Mount (+1 extra for the effect's setState), then 2 commits per keystroke vs 1.
    expect(commits('Effect filter')).toBe(8);
    expect(commits('Derived filter')).toBe(4);
  });

  it('only the effect version notifies when a saved cart is restored', async () => {
    const user = userEvent.setup();
    render(<YouMightNotNeedAnEffectDemo />);
    const log = within(screen.getByRole('log', { name: 'Notifications' }));

    await user.click(screen.getByRole('button', { name: 'Restore saved cart (effect)' }));
    await user.click(screen.getByRole('button', { name: 'Restore saved cart (handler)' }));
    expect(screen.getByLabelText('effect cart')).toHaveTextContent('Cart: 3 item(s)');
    expect(screen.getByLabelText('handler cart')).toHaveTextContent('Cart: 3 item(s)');
    expect(log.getByText(/effect: "Added to cart!" \(count 3\)/)).toBeInTheDocument();
    expect(log.queryByText(/handler:/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to cart (handler)' }));
    expect(log.getByText(/handler: "Added to cart!" \(count 4\)/)).toBeInTheDocument();
  });
});
