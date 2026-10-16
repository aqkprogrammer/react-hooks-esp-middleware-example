import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import UseScrollLockDemo from './UseScrollLockDemo';

afterEach(() => {
  document.body.removeAttribute('style');
});

describe('UseScrollLockDemo', () => {
  it('locks the body while the overlay is open and restores it after nested overlays close', async () => {
    const user = userEvent.setup();
    render(<UseScrollLockDemo />);
    const opener = screen.getByRole('button', { name: 'Open overlay' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Open nested confirmation' }));
    expect(screen.getByRole('dialog', { name: 'Discard changes?' })).toBeInTheDocument();

    // Escape closes only the innermost dialog; the page stays locked.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Discard changes?' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(opener).toHaveFocus();
  });

  it('logs the body styles on demand', async () => {
    const user = userEvent.setup();
    render(<UseScrollLockDemo />);
    await user.click(screen.getByRole('button', { name: 'Log body styles' }));
    expect(screen.getByText(/Now: body overflow=""/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open overlay' }));
    expect(screen.getByText(/Overlay opened: body overflow="hidden"/)).toBeInTheDocument();
  });
});
