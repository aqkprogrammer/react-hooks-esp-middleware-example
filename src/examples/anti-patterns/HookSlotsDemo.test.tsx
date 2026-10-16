import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import HookSlotsDemo from './HookSlotsDemo';

const slotTable = () =>
  screen.getByRole('table', { name: "Hook slots compared with this render's calls" });
const results = () =>
  within(slotTable())
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.lastElementChild?.querySelector('.badge')?.textContent);

describe('HookSlotsDemo', () => {
  it('shows the slots shifting when the conditional Hook is skipped', async () => {
    const user = userEvent.setup();
    render(<HookSlotsDemo />);
    expect(results()).toEqual(['OK', 'OK', 'OK', 'OK']);

    await user.click(screen.getByLabelText(/This render: the name field is filled in/));
    expect(results()).toEqual(['OK', 'Order changed', 'Order changed', 'Never reached']);
    expect(screen.getByRole('status')).toHaveTextContent('Rendered fewer hooks than expected');
  });

  it('keeps the order stable with the fixed code', async () => {
    const user = userEvent.setup();
    render(<HookSlotsDemo />);
    await user.click(screen.getByLabelText('Fixed code'));
    await user.click(screen.getByLabelText(/This render: the name field is filled in/));
    expect(results()).toEqual(['OK', 'OK', 'OK', 'OK']);
    expect(screen.getByLabelText('fixed code')).toHaveTextContent('condition inside the Hook');
  });

  it('demonstrates silently swapped state for Hooks in a loop', async () => {
    const user = userEvent.setup();
    render(<HookSlotsDemo />);
    await user.selectOptions(screen.getByLabelText('Scenario'), 'loop-state');
    expect(results()).toEqual(['OK', 'OK']);
    await user.click(screen.getByLabelText(/This render: the list is reversed/));
    expect(results()).toEqual(['Wrong state', 'Wrong state']);
    expect(screen.getByRole('status')).toHaveTextContent('No error and no warning');
  });
});
