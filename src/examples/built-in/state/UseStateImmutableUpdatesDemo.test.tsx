import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseStateImmutableUpdatesDemo from './UseStateImmutableUpdatesDemo';

const taskTitles = () =>
  within(screen.getByRole('list', { name: 'Tasks' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent?.replace(/↑Delete$/, ''));

describe('UseStateImmutableUpdatesDemo', () => {
  it('adds, toggles, reorders, sorts and removes tasks immutably', async () => {
    const user = userEvent.setup();
    render(<UseStateImmutableUpdatesDemo />);

    await user.type(screen.getByLabelText('New task'), 'Add tests{Enter}');
    expect(taskTitles()).toEqual([
      'Read the useState docs',
      'Write a reducer',
      'Ship it',
      'Add tests',
    ]);
    expect(screen.getByLabelText('New task')).toHaveValue('');

    const checkbox = screen.getByRole('checkbox', { name: 'Write a reducer' });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Move "Ship it" up' }));
    expect(taskTitles()[1]).toBe('Ship it');

    await user.click(screen.getByRole('button', { name: 'Sort A–Z (toSorted)' }));
    expect(taskTitles()).toEqual([
      'Add tests',
      'Read the useState docs',
      'Ship it',
      'Write a reducer',
    ]);

    await user.click(screen.getByRole('button', { name: 'Delete "Ship it"' }));
    expect(taskTitles()).not.toContain('Ship it');
  });

  it('updates a nested field without losing siblings', async () => {
    const user = userEvent.setup();
    render(<UseStateImmutableUpdatesDemo />);
    const city = screen.getByLabelText('City');
    await user.clear(city);
    await user.type(city, 'Paris');
    expect(
      screen.getByText(
        '{"profile":{"name":"Ada","address":{"city":"Paris","country":"UK"}},"notifications":{"email":true,"push":false}}',
      ),
    ).toBeInTheDocument();
  });

  it('shows that mutating state does not re-render until something else does', async () => {
    const user = userEvent.setup();
    render(<UseStateImmutableUpdatesDemo />);
    const items = () =>
      within(screen.getByRole('list', { name: 'Items' })).getAllByRole('listitem');

    await user.click(screen.getByRole('button', { name: 'items.push() then setItems(items)' }));
    expect(items()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Re-render for another reason' }));
    expect(items()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'setItems([...items, item])' }));
    expect(items()).toHaveLength(3);
  });
});
