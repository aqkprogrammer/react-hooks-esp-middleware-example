import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ListKeysDemo from './ListKeysDemo';

describe('ListKeysDemo', () => {
  it('keeps notes with the right guest when rows are keyed by id', async () => {
    const user = userEvent.setup();
    render(<ListKeysDemo />);
    await user.type(screen.getByLabelText('Notes for Ada'), 'vegan');
    await user.click(screen.getByRole('button', { name: 'Add guest to top' }));
    expect(screen.getByLabelText('Notes for Ada')).toHaveValue('vegan');
    expect(screen.getByLabelText('Notes for Guest 3')).toHaveValue('');
  });

  it('moves the notes to the wrong guest when rows are keyed by index', async () => {
    const user = userEvent.setup();
    render(<ListKeysDemo />);
    await user.click(screen.getByLabelText('array index (bug)'));
    await user.type(screen.getByLabelText('Notes for Ada'), 'vegan');
    await user.click(screen.getByRole('button', { name: 'Add guest to top' }));
    expect(screen.getByLabelText('Notes for Guest 3')).toHaveValue('vegan');
    expect(screen.getByLabelText('Notes for Ada')).toHaveValue('');
  });

  it('shifts notes up when the first row is removed with index keys', async () => {
    const user = userEvent.setup();
    render(<ListKeysDemo />);
    await user.click(screen.getByLabelText('array index (bug)'));
    await user.type(screen.getByLabelText('Notes for Ada'), 'vegan');
    await user.click(screen.getByRole('button', { name: 'Remove first guest' }));
    expect(screen.getByLabelText('Notes for Grace')).toHaveValue('vegan');
  });
});
