import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UndoRedoDemo from './UndoRedoDemo';

const cell = (row: number, column: number) =>
  screen.getByRole('button', { name: `Row ${row}, column ${column}` });
const value = (label: string) => screen.getByText(label).nextElementSibling;

describe('UndoRedoDemo', () => {
  it('undoes and redoes painted cells', async () => {
    const user = userEvent.setup();
    render(<UndoRedoDemo />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await user.click(cell(1, 1));
    await user.click(cell(2, 2));
    expect(cell(2, 2)).toHaveAttribute('aria-pressed', 'true');
    expect(value('Undo steps (past)')).toHaveTextContent('2 / 20');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(cell(2, 2)).toHaveAttribute('aria-pressed', 'false');
    expect(cell(1, 1)).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(cell(2, 2)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('does not record focus changes and supports keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<UndoRedoDemo />);
    await user.click(screen.getByRole('button', { name: 'Fill first row' }));
    await user.tab();
    expect(value('Undo steps (past)')).toHaveTextContent('1 / 20');
    cell(3, 3).focus();
    await user.keyboard('{Control>}z{/Control}');
    expect(value('Filled cells')).toHaveTextContent('0');
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(value('Filled cells')).toHaveTextContent('6');
  });

  it('starts a new branch after undo and can forget history', async () => {
    const user = userEvent.setup();
    render(<UndoRedoDemo />);
    await user.click(cell(1, 1));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await user.click(cell(6, 6));
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Forget history' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(value('Filled cells')).toHaveTextContent('1');
  });
});
