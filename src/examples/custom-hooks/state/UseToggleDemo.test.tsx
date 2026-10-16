import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseToggleDemo from './UseToggleDemo';

describe('UseToggleDemo', () => {
  it('toggles the switch and cycles / jumps through themes', async () => {
    const user = userEvent.setup();
    render(<UseToggleDemo />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    expect(screen.getByRole('radio', { name: 'light' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Next theme' }));
    expect(screen.getByRole('radio', { name: 'dark' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'system' }));
    await user.click(screen.getByRole('button', { name: 'Next theme' }));
    expect(screen.getByRole('radio', { name: 'light' })).toBeChecked();
  });
});
