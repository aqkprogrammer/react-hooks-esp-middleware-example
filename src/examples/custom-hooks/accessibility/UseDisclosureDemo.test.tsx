import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../hooks/accessibility/testing/expectNoAxeViolations';
import UseDisclosureDemo from './UseDisclosureDemo';

const trigger = (name: string) => screen.getByRole('button', { name });

describe('UseDisclosureDemo', () => {
  it('works as a single-open accordion by default', async () => {
    const user = userEvent.setup();
    render(<UseDisclosureDemo />);
    expect(trigger('How long does shipping take?')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'How long does shipping take?' })).toBeVisible();

    await user.click(trigger('Can I return an item?'));
    expect(trigger('Can I return an item?')).toHaveAttribute('aria-expanded', 'true');
    expect(trigger('How long does shipping take?')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'How long does shipping take?' })).toBeNull();
  });

  it('allows several open sections and keyboard toggling', async () => {
    const user = userEvent.setup();
    render(<UseDisclosureDemo />);
    await user.click(screen.getByLabelText('Allow several sections open at once'));
    trigger('Is there a warranty?').focus();
    await user.keyboard('{Enter}');
    expect(trigger('Is there a warranty?')).toHaveAttribute('aria-expanded', 'true');
    expect(trigger('How long does shipping take?')).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(trigger('Is there a warranty?')).toHaveAttribute('aria-expanded', 'false');
  });

  it('"Show more" reveals extra text', async () => {
    const user = userEvent.setup();
    render(<UseDisclosureDemo />);
    expect(screen.getByText(/removable limescale filter/)).not.toBeVisible();
    await user.click(trigger('Show more'));
    expect(screen.getByText(/removable limescale filter/)).toBeVisible();
    expect(trigger('Show less')).toHaveAttribute('aria-expanded', 'true');
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<UseDisclosureDemo />);
    await expectNoAxeViolations(container);
  });
});
