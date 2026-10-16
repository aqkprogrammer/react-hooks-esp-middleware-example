import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import UseKeyboardShortcutDemo from './UseKeyboardShortcutDemo';

const current = () => screen.getByRole('listitem', { current: true });

describe('UseKeyboardShortcutDemo', () => {
  it('runs every shortcut on the cheat sheet', async () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    const user = userEvent.setup();
    render(<UseKeyboardShortcutDemo />);
    expect(screen.getByRole('table', { name: 'Keyboard shortcuts' })).toBeVisible();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();

    await user.keyboard('jj');
    expect(current()).toHaveTextContent('Sent');
    await user.keyboard('k');
    expect(current()).toHaveTextContent('Drafts');

    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByLabelText('Search mail')).toHaveFocus();
    // While typing, single-key shortcuts are ignored…
    await user.keyboard('jk');
    expect(screen.getByLabelText('Search mail')).toHaveValue('jk');
    expect(current()).toHaveTextContent('Drafts');

    await user.click(document.body);
    await user.keyboard('{Shift>}?{/Shift}');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show cheat sheet' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('can switch single-key shortcuts off', async () => {
    const user = userEvent.setup();
    render(<UseKeyboardShortcutDemo />);
    await user.click(screen.getByLabelText('Enable single-key shortcuts (j / k)'));
    await user.keyboard('j');
    expect(current()).toHaveTextContent('Inbox');
    expect(screen.getAllByText('(off)')).toHaveLength(2);
  });

  it('shows Apple symbols on macOS', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    render(<UseKeyboardShortcutDemo />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
    expect(screen.getByText('⇧?')).toBeInTheDocument();
  });
});
