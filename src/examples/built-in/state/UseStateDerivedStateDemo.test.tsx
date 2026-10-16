import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseStateDerivedStateDemo from './UseStateDerivedStateDemo';

describe('UseStateDerivedStateDemo', () => {
  it('duplicated selection goes stale while the derived one follows edits', async () => {
    const user = userEvent.setup();
    render(<UseStateDerivedStateDemo />);

    for (const prefix of ['Duplicated', 'Derived']) {
      const name = screen.getByLabelText(`${prefix}: name of item 1`);
      await user.clear(name);
      await user.type(name, 'Bagel');
    }

    expect(screen.getByLabelText('Duplicated summary')).toHaveTextContent('Selected: Pretzel');
    expect(screen.getByLabelText('Derived summary')).toHaveTextContent('Selected: Bagel');
  });

  it('a duplicated total drifts while the derived total stays correct', async () => {
    const user = userEvent.setup();
    render(<UseStateDerivedStateDemo />);

    for (const prefix of ['Duplicated', 'Derived']) {
      const price = screen.getByLabelText(`${prefix}: price of item 2`);
      await user.clear(price);
      await user.type(price, '10');
    }

    expect(screen.getByLabelText('Duplicated summary')).toHaveTextContent('Total: 9');
    expect(screen.getByLabelText('Derived summary')).toHaveTextContent('Total: 15');

    await user.click(screen.getByRole('button', { name: 'Reset duplicated panel' }));
    expect(screen.getByLabelText('Duplicated summary')).toHaveTextContent('Total: 9');
    expect(screen.getByLabelText('Duplicated: price of item 2')).toHaveValue(4);
  });

  it('selecting another item updates both summaries', async () => {
    const user = userEvent.setup();
    render(<UseStateDerivedStateDemo />);
    await user.click(screen.getByRole('radio', { name: 'Derived: select item 3' }));
    expect(screen.getByLabelText('Derived summary')).toHaveTextContent('Selected: Granola bar');
  });
});
