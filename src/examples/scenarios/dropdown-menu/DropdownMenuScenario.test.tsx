import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import DropdownMenuScenario from './DropdownMenuScenario';
import { findByFirstLetter } from './menuModel';

const menuButton = () => screen.getByRole('button', { name: 'View options' });
const menu = () => screen.getByRole('menu', { name: 'View options' });
const ITEM_ROLES = ['menuitem', 'menuitemcheckbox', 'menuitemradio'] as const;
const item = (name: string | RegExp): HTMLElement => {
  const matches = ITEM_ROLES.flatMap((role) => within(menu()).queryAllByRole(role, { name }));
  if (matches.length !== 1) throw new Error(`Expected one menu item named ${String(name)}`);
  return matches[0] as HTMLElement;
};
const fileNames = () =>
  within(screen.getByRole('list', { name: 'Files' }))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('.mono')?.textContent);

async function setup() {
  const user = userEvent.setup();
  render(<DropdownMenuScenario />);
  return user;
}

describe('DropdownMenuScenario', () => {
  it('exposes the APG menu button attributes', async () => {
    const user = await setup();
    const button = menuButton();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).not.toHaveAttribute('aria-controls');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', menu().id);
    expect(within(menu()).getAllByRole('menuitem')).toHaveLength(3);
    expect(within(menu()).getAllByRole('menuitemcheckbox')).toHaveLength(2);
    const group = within(menu()).getByRole('group', { name: 'Sort by' });
    expect(within(group).getAllByRole('menuitemradio')).toHaveLength(3);
    expect(item('Name')).toHaveAttribute('aria-checked', 'true');
    expect(item('Show hidden files')).toHaveAttribute('aria-checked', 'false');
    expect(item(/Share/)).toHaveAttribute('aria-disabled', 'true');
    expect(item('New folder')).toHaveFocus();
  });

  it('opens from the keyboard: Enter/Space/↓ focus the first item, ↑ the last', async () => {
    const user = await setup();
    menuButton().focus();
    await user.keyboard('{Enter}');
    expect(item('New folder')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(menuButton()).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.keyboard(' ');
    expect(item('New folder')).toHaveFocus();
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowDown}');
    expect(item('New folder')).toHaveFocus();
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowUp}');
    expect(item(/Share/)).toHaveFocus();
  });

  it('moves with arrow keys (wrapping), Home and End using a roving tabindex', async () => {
    const user = await setup();
    await user.click(menuButton());
    await user.keyboard('{ArrowDown}');
    expect(item('Refresh')).toHaveFocus();
    expect(item('Refresh')).toHaveAttribute('tabindex', '0');
    expect(item('New folder')).toHaveAttribute('tabindex', '-1');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(item(/Share/)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(item('New folder')).toHaveFocus();
    await user.keyboard('{End}');
    expect(item(/Share/)).toHaveFocus();
    await user.keyboard('{Home}');
    expect(item('New folder')).toHaveFocus();
  });

  it('jumps by first letter (typeahead), cycling through matches', async () => {
    const user = await setup();
    await user.click(menuButton());
    await user.keyboard('s');
    expect(item('Show hidden files')).toHaveFocus();
    await user.keyboard('s');
    expect(item('Show file sizes')).toHaveFocus();
    await user.keyboard('S');
    expect(item('Size')).toHaveFocus();
    await user.keyboard('d');
    expect(item('Date modified')).toHaveFocus();
    await user.keyboard('x');
    expect(item('Date modified')).toHaveFocus();
  });

  it('toggles check items with Space without closing, and Enter closes', async () => {
    const user = await setup();
    await user.click(menuButton());
    expect(fileNames()).not.toContain('.cache');
    await user.keyboard('s ');
    expect(item('Show hidden files')).toHaveAttribute('aria-checked', 'true');
    expect(item('Show hidden files')).toHaveFocus();
    expect(fileNames()).toContain('.cache');

    await user.keyboard('{End}{ArrowUp}{ArrowUp} ');
    expect(item('Size')).toHaveAttribute('aria-checked', 'true');
    expect(item('Name')).toHaveAttribute('aria-checked', 'false');
    expect(fileNames()[0]).toBe('photos');

    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
    expect(fileNames()[0]).toBe('.cache');
  });

  it('runs actions with Enter or click, closes and returns focus to the button', async () => {
    const user = await setup();
    await user.click(menuButton());
    await user.keyboard('{Enter}');
    expect(fileNames()).toContain('New folder 1');
    expect(menuButton()).toHaveFocus();

    await user.click(menuButton());
    await user.click(item('Refresh'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByText('refreshed the file list')).toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
  });

  it('keeps the menu open for a disabled item', async () => {
    const user = await setup();
    await user.click(menuButton());
    await user.keyboard('{End}{Enter}');
    expect(menu()).toBeInTheDocument();
    expect(item(/Share/)).toHaveFocus();
  });

  it('closes on Tab and moves focus to the next element in the page', async () => {
    const user = await setup();
    // Log something so the event log's Clear button (the next tab stop) is enabled.
    await user.click(menuButton());
    await user.click(item('Refresh'));

    await user.click(menuButton());
    await user.keyboard('{ArrowDown}');
    await user.tab();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear log' })).toHaveFocus();

    await user.click(menuButton());
    await user.tab({ shift: true });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
  });

  it('closes when clicking outside, and toggles from the button', async () => {
    const user = await setup();
    await user.click(menuButton());
    await user.click(screen.getByRole('heading', { name: 'Project files' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton());
    await user.click(menuButton());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('has no detectable accessibility violations while open', async () => {
    const user = await setup();
    await user.click(menuButton());
    await expectNoAxeViolations(document.body);
  });
});

describe('findByFirstLetter', () => {
  it('searches forward from the current item and wraps', () => {
    const labels = ['Apple', 'Banana', 'avocado'];
    expect(findByFirstLetter(labels, 0, 'a')).toBe(2);
    expect(findByFirstLetter(labels, 2, 'A')).toBe(0);
    expect(findByFirstLetter(labels, 1, 'z')).toBe(-1);
  });
});
