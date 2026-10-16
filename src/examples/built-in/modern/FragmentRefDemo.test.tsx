import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FragmentRefDemo from './FragmentRefDemo';

const toolbar = () => within(screen.getByRole('toolbar', { name: 'Formatting' }));

describe('FragmentRefDemo', () => {
  it('moves focus to the first and last child of the Fragment', async () => {
    const user = userEvent.setup();
    render(<FragmentRefDemo />);
    await user.click(screen.getByRole('button', { name: 'Focus first in group' }));
    expect(toolbar().getByRole('button', { name: 'Bold' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Focus last in group' }));
    expect(toolbar().getByRole('button', { name: 'Strikethrough' })).toHaveFocus();
  });

  it('receives clicks on its children through FragmentInstance.addEventListener', async () => {
    const user = userEvent.setup();
    render(<FragmentRefDemo />);
    await user.click(toolbar().getByRole('button', { name: 'Italic' }));
    await user.click(toolbar().getByRole('button', { name: 'Underline' }));
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Underline', { selector: 'dd' })).toBeInTheDocument();
    // Clicks outside the Fragment are not counted.
    await user.click(screen.getByRole('button', { name: 'Focus first in group' }));
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('removes the listener from every child when the ref cleanup runs', () => {
    const { unmount } = render(<FragmentRefDemo />);
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
    unmount();
    const removedClickListeners = removeSpy.mock.calls.filter(([type]) => type === 'click');
    expect(removedClickListeners).toHaveLength(4);
  });
});
