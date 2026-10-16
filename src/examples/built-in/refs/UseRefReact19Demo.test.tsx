import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseRefReact19Demo from './UseRefReact19Demo';

const logText = () => screen.getByRole('log', { name: 'Ref callbacks' }).textContent ?? '';
const logCount = (pattern: RegExp) =>
  within(screen.getByRole('log', { name: 'Ref callbacks' })).queryAllByText(pattern).length;

describe('UseRefReact19Demo', () => {
  it('passes ref as a plain prop to a function component', async () => {
    const user = userEvent.setup();
    render(<UseRefReact19Demo />);
    await user.click(screen.getByRole('button', { name: 'Focus' }));
    const input = screen.getByLabelText('Fancy input');
    expect(input).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Select all' }));
    expect((input as HTMLInputElement).selectionStart).toBe(0);
    expect((input as HTMLInputElement).selectionEnd).toBe('Select me'.length);
  });

  it('attaches each row once and runs the returned cleanup on removal', async () => {
    const user = userEvent.setup();
    render(<UseRefReact19Demo />);
    expect(logCount(/ref attached/)).toBe(3);
    expect(logText()).toContain('ref attached: item 3 (3 tracked)');

    await user.click(screen.getByRole('button', { name: 'Add item' }));
    expect(logText()).toContain('ref attached: item 4 (4 tracked)');
    // Re-rendering the list did not detach/re-attach the existing rows.
    expect(logCount(/ref attached/)).toBe(4);
    expect(logCount(/ref cleanup/)).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Remove Bread' }));
    expect(logText()).toContain('ref cleanup: item 2 (3 tracked)');
    expect(logCount(/ref cleanup/)).toBe(1);
  });

  it('uses the node map to focus an item, and reports missing ones', async () => {
    const user = userEvent.setup();
    render(<UseRefReact19Demo />);
    const id = screen.getByLabelText('Item id');
    await user.clear(id);
    await user.type(id, '3');
    await user.click(screen.getByRole('button', { name: 'Scroll to and focus item' }));
    expect(screen.getByRole('listitem', { name: 'Cheese (id 3)' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Remove Cheese' }));
    await user.click(screen.getByRole('button', { name: 'Scroll to and focus item' }));
    expect(logText()).toContain('item 3 is not rendered');
  });
});
