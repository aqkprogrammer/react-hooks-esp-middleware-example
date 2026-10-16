import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ImmutableUpdatesDemo from './ImmutableUpdatesDemo';

const titles = () =>
  within(screen.getByRole('list', { name: 'Todos' }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('label')?.textContent);

describe('ImmutableUpdatesDemo', () => {
  it('adds, toggles and removes with new arrays and objects', async () => {
    const user = userEvent.setup();
    render(<ImmutableUpdatesDemo />);
    await user.type(screen.getByLabelText('New todo'), 'Deploy');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(titles()).toEqual(['Write tests', 'Review PR', 'Deploy']);

    await user.click(screen.getByLabelText('Write tests'));
    expect(screen.getByLabelText('Write tests')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Remove Review PR' }));
    expect(titles()).toEqual(['Write tests', 'Deploy']);
  });

  it('sorts a copy and undoes every step from the kept snapshots', async () => {
    const user = userEvent.setup();
    render(<ImmutableUpdatesDemo />);
    await user.click(screen.getByLabelText('Sort by title (a sorted copy)'));
    expect(titles()).toEqual(['Review PR', 'Write tests']);
    await user.click(screen.getByLabelText('Sort by title (a sorted copy)'));
    expect(titles()).toEqual(['Write tests', 'Review PR']);

    await user.click(screen.getByLabelText('Write tests'));
    await user.click(screen.getByRole('button', { name: 'Remove Review PR' }));
    await user.click(screen.getByRole('button', { name: 'Undo (2)' }));
    expect(titles()).toEqual(['Write tests', 'Review PR']);
    await user.click(screen.getByRole('button', { name: 'Undo (1)' }));
    expect(screen.getByLabelText('Write tests')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Undo (0)' })).toBeDisabled();
  });
});
