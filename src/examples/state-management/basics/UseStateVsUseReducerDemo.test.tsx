import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseStateVsUseReducerDemo from './UseStateVsUseReducerDemo';

describe('UseStateVsUseReducerDemo', () => {
  it.each(['useState', 'useReducer'])('%s version enforces the same rules', async (name) => {
    const user = userEvent.setup();
    render(<UseStateVsUseReducerDemo />);
    const panel = within(screen.getByRole('region', { name }));
    await user.click(panel.getByRole('button', { name: 'Add child' }));
    await user.click(panel.getByRole('button', { name: 'Add child' }));
    expect(panel.getByText('Children').nextElementSibling).toHaveTextContent('2');

    await user.click(panel.getByRole('button', { name: 'Remove adult' }));
    expect(panel.getByText('Adults').nextElementSibling).toHaveTextContent('0');
    expect(panel.getByText('Children').nextElementSibling).toHaveTextContent('0');
    expect(panel.getByRole('button', { name: 'Add child' })).toBeDisabled();

    for (let i = 0; i < 6; i += 1) {
      await user.click(panel.getByRole('button', { name: 'Add adult' }));
    }
    expect(panel.getByText('Fully booked')).toBeInTheDocument();
    expect(panel.getByRole('button', { name: 'Add adult' })).toBeDisabled();

    await user.click(panel.getByRole('button', { name: 'Reset' }));
    expect(panel.getByText('Adults').nextElementSibling).toHaveTextContent('1');
  });
});
