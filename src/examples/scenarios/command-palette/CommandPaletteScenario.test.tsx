import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../hooks/accessibility/testing/expectNoAxeViolations';
import { installDialogPolyfill } from '../../../hooks/accessibility/testing/installDialogPolyfill';
import { overrideProperty } from '../../../test/browserMocks';
import CommandPaletteScenario from './CommandPaletteScenario';
import { buildSections, pushRecent, RECENT_KEY, scoreCommand, type Command } from './commands';

let uninstall: () => void = () => {};
beforeEach(() => {
  uninstall = installDialogPolyfill();
});
afterEach(() => {
  uninstall();
  window.location.hash = '';
});

const trigger = () => screen.getByRole('button', { name: /Search commands/ });
const dialog = () => screen.getByRole('dialog', { name: 'Command palette' });
const combobox = () => screen.getByRole('combobox', { name: 'Search commands' });
const groups = () =>
  within(screen.getByRole('listbox', { name: 'Commands' }))
    .getAllByRole('group')
    .map((group) => group.getAttribute('aria-labelledby'))
    .map((id) => document.getElementById(id ?? '')?.textContent);
const activeOption = () =>
  document.getElementById(combobox().getAttribute('aria-activedescendant') ?? '');

describe('CommandPaletteScenario', () => {
  it('opens with Ctrl+K on non-Apple platforms and focuses the combobox', async () => {
    const user = userEvent.setup();
    render(<CommandPaletteScenario />);
    expect(trigger()).toHaveTextContent('Ctrl+K');
    await user.keyboard('{Control>}k{/Control}');
    expect(dialog()).toHaveAttribute('open');
    expect(combobox()).toHaveFocus();
    expect(combobox()).toHaveAttribute('aria-expanded', 'true');
    expect(combobox()).toHaveAttribute('aria-autocomplete', 'list');
    expect(groups()).toEqual(['Navigation', 'Actions']);
    expect(activeOption()).toHaveTextContent('Go to the home page');
    expect(activeOption()).toHaveAttribute('aria-selected', 'true');

    // The same shortcut toggles it closed, even from inside the input.
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses ⌘K on Apple platforms (and ignores Ctrl+K there)', async () => {
    const restore = overrideProperty(navigator, 'platform', 'MacIntel');
    try {
      const user = userEvent.setup();
      render(<CommandPaletteScenario />);
      expect(trigger()).toHaveTextContent('⌘K');
      await user.keyboard('{Control>}k{/Control}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await user.keyboard('{Meta>}k{/Meta}');
      expect(dialog()).toHaveAttribute('open');
    } finally {
      restore();
    }
  });

  it('works while typing in another field and restores focus there on Escape', async () => {
    const user = userEvent.setup();
    render(
      <>
        <label>
          Notes <input />
        </label>
        <CommandPaletteScenario />
      </>,
    );
    await user.click(screen.getByLabelText('Notes'));
    await user.keyboard('{Control>}k{/Control}');
    expect(combobox()).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toHaveFocus();
  });

  it('filters commands, ranks title prefixes first and shows a "no results" state', async () => {
    const user = userEvent.setup();
    render(<CommandPaletteScenario />);
    await user.click(trigger());
    await user.type(combobox(), 'dialog');
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.firstChild?.textContent)).toEqual([
      'Go to useDialogState',
      'Go to Modal dialog scenario',
    ]);
    expect(activeOption()).toBe(options[0]);
    await waitFor(() =>
      expect(document.querySelector('[data-live-announcer="polite"]')).toHaveTextContent(
        '2 commands available.',
      ),
    );

    await user.clear(combobox());
    await user.type(combobox(), 'zzz');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    expect(combobox()).not.toHaveAttribute('aria-activedescendant');
    expect(screen.getByText('No commands match “zzz”.')).toBeInTheDocument();
  });

  it('navigates with the arrow keys (wrapping) and runs a navigation command with Enter', async () => {
    const user = userEvent.setup();
    render(<CommandPaletteScenario />);
    await user.click(trigger());
    await user.keyboard('{ArrowUp}');
    expect(activeOption()).toHaveTextContent('Clear recent commands');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Go to useDebounce');
    await user.keyboard('{Enter}');
    expect(window.location.hash).toBe('#/entry/use-debounce');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('runs local actions, restores focus to the trigger and remembers recent commands', async () => {
    const user = userEvent.setup();
    render(<CommandPaletteScenario />);
    await user.click(trigger());
    await user.type(combobox(), 'density');
    await user.keyboard('{Enter}');
    expect(screen.getByText('compact')).toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    expect(JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]')).toEqual(['toggle-density']);

    await user.click(trigger());
    expect(groups()).toEqual(['Recent', 'Navigation', 'Actions']);
    expect(activeOption()).toHaveTextContent('Toggle compact density');
    await user.click(screen.getByRole('option', { name: /Toggle keyboard hints/ }));
    expect(screen.getByText('hidden')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]')).toEqual([
      'toggle-hints',
      'toggle-density',
    ]);

    await user.click(trigger());
    await user.type(combobox(), 'clear recent{Enter}');
    expect(window.localStorage.getItem(RECENT_KEY)).toBeNull();
    await user.click(trigger());
    expect(groups()).toEqual(['Navigation', 'Actions']);
  });

  it('ignores corrupt recent-command storage', async () => {
    window.localStorage.setItem(RECENT_KEY, '{"not":"a list"}');
    const user = userEvent.setup();
    render(<CommandPaletteScenario />);
    await user.click(trigger());
    expect(groups()).toEqual(['Navigation', 'Actions']);
  });

  it('has no detectable accessibility violations while open', async () => {
    const user = userEvent.setup();
    render(<CommandPaletteScenario />);
    await user.click(trigger());
    await user.keyboard('{ArrowDown}');
    await expectNoAxeViolations(document.body);
    await user.type(combobox(), 'zzz');
    await expectNoAxeViolations(document.body);
  });
});

describe('command helpers', () => {
  const command = (id: string, title: string, keywords: string[] = []): Command => ({
    id,
    title,
    group: 'Navigation',
    keywords,
    run: () => {},
  });

  it('scores prefix matches above substring and keyword matches', () => {
    const debounce = command('a', 'Debounce input', ['timing']);
    expect(scoreCommand(debounce, 'deb')).toBe(3);
    expect(scoreCommand(debounce, 'input')).toBe(2);
    expect(scoreCommand(debounce, 'timing')).toBe(1);
    expect(scoreCommand(debounce, 'timing input')).toBe(1);
    expect(scoreCommand(debounce, 'nope')).toBe(0);
  });

  it('keeps recent commands unique and capped', () => {
    expect(pushRecent(['a', 'b', 'c', 'd', 'e'], 'c')).toEqual(['c', 'a', 'b', 'd', 'e']);
    expect(pushRecent(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
  });

  it('skips unknown recent ids', () => {
    const sections = buildSections([command('a', 'Alpha')], '', ['gone', 'a']);
    expect(sections.map((section) => section.group)).toEqual(['Recent']);
  });
});
