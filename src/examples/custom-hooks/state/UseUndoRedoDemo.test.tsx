import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseUndoRedoDemo from './UseUndoRedoDemo';

describe('UseUndoRedoDemo', () => {
  // shouldAdvanceTime: Testing Library's async wrapper waits on a real
  // setTimeout, which would never fire with fully frozen fake timers.
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('undoes and redoes painting with buttons and keyboard shortcuts', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UseUndoRedoDemo />);
    const cell = screen.getByRole('button', { name: 'Row 1, column 1' });
    await user.click(cell);
    expect(cell).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(cell).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(cell).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(cell).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
    expect(cell).toHaveAttribute('aria-pressed', 'true');
  });

  it('coalesces a burst of typing into one undo step', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<UseUndoRedoDemo />);
    const title = screen.getByLabelText('Title (typing is coalesced)');
    await user.clear(title);
    await user.type(title, 'Cat');
    act(() => vi.advanceTimersByTime(1500));
    await user.type(title, '!');
    expect(screen.getByLabelText('History')).toHaveTextContent('Undo steps (past)2');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(title).toHaveValue('Cat');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(title).toHaveValue('Untitled');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
});
