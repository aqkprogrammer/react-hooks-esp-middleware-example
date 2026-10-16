import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseCounterDemo from './UseCounterDemo';

describe('UseCounterDemo', () => {
  it('steps within the bounds and clamps', async () => {
    const user = userEvent.setup();
    render(<UseCounterDemo />);
    const value = screen.getByLabelText('Quantity value');
    expect(value).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: 'Decrease' }));
    expect(value).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Set to 100 (clamped)' }));
    expect(value).toHaveTextContent('10');
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();

    const max = screen.getByLabelText('max');
    await user.clear(max);
    await user.type(max, '4');
    expect(value).toHaveTextContent('4');
  });

  it('reports invalid bounds instead of crashing', async () => {
    const user = userEvent.setup();
    render(<UseCounterDemo />);
    const min = screen.getByLabelText('min');
    await user.clear(min);
    await user.type(min, '50');
    expect(screen.getByText('max must be ≥ min')).toBeInTheDocument();
  });
});
