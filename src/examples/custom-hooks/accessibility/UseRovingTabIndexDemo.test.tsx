import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import UseRovingTabIndexDemo from './UseRovingTabIndexDemo';

describe('UseRovingTabIndexDemo', () => {
  it('moves through the toolbar with arrows, skipping the disabled button', async () => {
    const user = userEvent.setup();
    render(<UseRovingTabIndexDemo />);
    await user.tab();
    const bold = screen.getByRole('button', { name: 'Bold' });
    expect(bold).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    // "Clear formatting" is disabled (nothing to clear) → wraps to "Align right".
    expect(screen.getByRole('button', { name: 'Align right' })).toHaveFocus();
    await user.keyboard('{Home}{Enter}');
    expect(bold).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Clear formatting' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(bold).toHaveAttribute('aria-pressed', 'false');
    expect(bold).toHaveFocus();
    // Tab leaves the toolbar in one step.
    await user.tab();
    expect(screen.getByRole('checkbox', { name: 'Wrap around at the ends' })).toHaveFocus();
  });

  it('selection follows focus in the vertical tab list', async () => {
    const user = userEvent.setup();
    render(<UseRovingTabIndexDemo />);
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Specs' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Specs' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Specs' })).toBeVisible();
    await user.keyboard('{End}');
    expect(screen.getByRole('tabpanel', { name: 'Reviews' })).toBeVisible();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<UseRovingTabIndexDemo />);
    await expectNoAxeViolations(container);
  });
});
