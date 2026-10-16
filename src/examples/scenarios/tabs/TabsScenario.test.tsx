import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import TabsScenario from './TabsScenario';

const tab = (name: string) => screen.getByRole('tab', { name });
const panelOf = (name: string) => {
  const panel = document.getElementById(tab(name).getAttribute('aria-controls') ?? '');
  if (!panel) throw new Error(`No panel for ${name}`);
  return panel;
};
const selectedTabs = () =>
  screen.getAllByRole('tab').filter((element) => element.getAttribute('aria-selected') === 'true');

async function setup({ manual = false } = {}) {
  const user = userEvent.setup();
  render(<TabsScenario />);
  if (manual) await user.click(screen.getByLabelText(/Automatic activation/));
  return user;
}

describe('TabsScenario', () => {
  it('wires tablist, tabs and tabpanels per APG', () => {
    render(<TabsScenario />);
    const tablist = screen.getByRole('tablist', { name: 'Meeting workspace' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((element) => element.textContent)).toEqual(['Notes', 'Timer', 'Checklist']);
    expect(tabs.map((element) => element.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(tabs.map((element) => element.tabIndex)).toEqual([0, -1, -1]);
    for (const element of tabs) {
      const panel = panelOf(element.textContent ?? '');
      expect(panel).toHaveAttribute('role', 'tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', element.id);
    }
    expect(screen.getByRole('tabpanel', { name: 'Notes' })).toBeVisible();
    expect(panelOf('Timer')).not.toBeVisible();
  });

  it('automatic activation: arrows, Home and End move focus and select (wrapping)', async () => {
    const user = await setup();
    await user.click(tab('Notes'));
    await user.keyboard('{ArrowRight}');
    expect(tab('Timer')).toHaveFocus();
    expect(selectedTabs()).toEqual([tab('Timer')]);
    expect(screen.getByRole('tabpanel', { name: 'Timer' })).toBeVisible();

    await user.keyboard('{End}');
    expect(selectedTabs()).toEqual([tab('Checklist')]);
    await user.keyboard('{ArrowRight}');
    expect(tab('Notes')).toHaveFocus();
    expect(selectedTabs()).toEqual([tab('Notes')]);
    await user.keyboard('{ArrowLeft}');
    expect(selectedTabs()).toEqual([tab('Checklist')]);
    await user.keyboard('{Home}');
    expect(selectedTabs()).toEqual([tab('Notes')]);
  });

  it('manual activation: arrows only move focus; Enter or Space selects', async () => {
    const user = await setup({ manual: true });
    await user.click(tab('Notes'));
    await user.keyboard('{ArrowRight}');
    expect(tab('Timer')).toHaveFocus();
    expect(selectedTabs()).toEqual([tab('Notes')]);
    expect(panelOf('Timer')).toBeEmptyDOMElement();

    await user.keyboard('{Enter}');
    expect(selectedTabs()).toEqual([tab('Timer')]);
    await user.keyboard('{ArrowRight} ');
    expect(selectedTabs()).toEqual([tab('Checklist')]);
  });

  it('is one tab stop: Tab moves into the panel and Shift+Tab returns to the selected tab', async () => {
    const user = await setup({ manual: true });
    await user.click(tab('Notes'));
    await user.keyboard('{ArrowRight}');
    expect(tab('Timer')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('tabpanel', { name: 'Notes' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(tab('Notes')).toHaveFocus();
  });

  it('renders panels lazily and keeps their state when switching', async () => {
    const user = await setup();
    expect(panelOf('Checklist')).toBeEmptyDOMElement();
    expect(screen.getByText('Rendered so far: Notes')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Meeting notes'), 'Agenda first');
    await user.click(tab('Checklist'));
    await user.click(screen.getByLabelText('Book a room'));
    expect(screen.getByText('Rendered so far: Notes, Checklist')).toBeInTheDocument();
    // Hidden, not unmounted.
    expect(within(panelOf('Notes')).getByDisplayValue('Agenda first')).not.toBeVisible();

    await user.click(tab('Notes'));
    expect(screen.getByLabelText('Meeting notes')).toHaveValue('Agenda first');
    await user.click(tab('Checklist'));
    expect(screen.getByLabelText('Book a room')).toBeChecked();
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
  });

  it('disconnects effects of hidden panels: the timer pauses while another tab is shown', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      render(<TabsScenario />);
      fireEvent.click(tab('Timer'));
      fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
      act(() => vi.advanceTimersByTime(3000));
      expect(within(panelOf('Timer')).getByText('3s')).toBeInTheDocument();

      fireEvent.click(tab('Notes'));
      act(() => vi.advanceTimersByTime(5000));
      fireEvent.click(tab('Timer'));
      expect(within(panelOf('Timer')).getByText('3s')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pause timer' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      act(() => vi.advanceTimersByTime(1000));
      expect(within(panelOf('Timer')).getByText('4s')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('has no detectable accessibility violations', async () => {
    const user = await setup();
    await user.click(tab('Checklist'));
    await expectNoAxeViolations(document.body);
  });
});
