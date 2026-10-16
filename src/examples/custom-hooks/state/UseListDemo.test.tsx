import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseListDemo from './UseListDemo';

const items = () =>
  within(screen.getByRole('list', { name: 'Tasks' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent?.replace(/[↑↓✕]/g, '').trim());

describe('UseListDemo', () => {
  it('adds, inserts, moves, removes and filters tasks', async () => {
    const user = userEvent.setup();
    render(<UseListDemo />);
    expect(items()).toEqual(['Write the hook', 'Write the tests', 'Write the docs']);

    await user.type(screen.getByLabelText('New task'), 'Ship it{Enter}');
    expect(items()).toHaveLength(4);
    expect(items()[3]).toBe('Ship it');

    await user.type(screen.getByLabelText('New task'), 'Fix bug');
    await user.click(screen.getByRole('button', { name: 'Insert at top' }));
    expect(items()[0]).toBe('Fix bug');

    await user.click(screen.getByRole('button', { name: 'Move "Fix bug" down' }));
    expect(items()[1]).toBe('Fix bug');

    await user.click(screen.getByRole('button', { name: 'Remove "Fix bug"' }));
    expect(items()).not.toContain('Fix bug');

    await user.click(screen.getByRole('checkbox', { name: 'Write the docs' }));
    await user.click(screen.getByRole('button', { name: 'Remove done (filter)' }));
    expect(items()).toEqual(['Write the tests', 'Ship it']);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('No tasks.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(items()).toHaveLength(3);
  });
});
