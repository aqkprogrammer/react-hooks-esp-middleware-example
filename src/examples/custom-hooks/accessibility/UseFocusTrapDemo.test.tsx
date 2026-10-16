import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import UseFocusTrapDemo from './UseFocusTrapDemo';

describe('UseFocusTrapDemo', () => {
  it('traps Tab inside the drawer and restores focus on Escape', async () => {
    const user = userEvent.setup();
    render(<UseFocusTrapDemo />);
    const opener = screen.getByRole('button', { name: 'Open menu' });
    await user.click(opener);
    const drawer = screen.getByRole('dialog', { name: 'Menu' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Add a saved page' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    for (let index = 0; index < 8; index += 1) {
      await user.tab();
      expect(drawer).toContainElement(document.activeElement as HTMLElement);
    }

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('includes items added while open and logs navigation', async () => {
    const user = userEvent.setup();
    render(<UseFocusTrapDemo />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByRole('button', { name: 'Add a saved page' }));
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Saved page 1' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText(/navigated to Saved page 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });

  it('has no detectable accessibility violations while open', async () => {
    const user = userEvent.setup();
    const { container } = render(<UseFocusTrapDemo />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await expectNoAxeViolations(container);
  });
});
