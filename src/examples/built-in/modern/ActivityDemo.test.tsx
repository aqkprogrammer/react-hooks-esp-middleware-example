import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ActivityDemo from './ActivityDemo';

const tabButton = (name: string) =>
  within(screen.getByRole('group', { name: 'Tabs' })).getByRole('button', { name });
const effectLog = () => screen.getByRole('log', { name: 'Effect log' });
// Hidden elements have no accessible name, so look the section up by attribute.
const composeSection = () => document.querySelector('section[aria-label="Compose tab"]');

describe('ActivityDemo', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps a hidden tab’s state with <Activity>', async () => {
    const user = userEvent.setup();
    render(<ActivityDemo />);
    await user.type(screen.getByLabelText('Draft'), 'hello');
    await user.click(tabButton('Timer'));

    // Still in the DOM, but hidden with display: none.
    expect(composeSection()).toBeInTheDocument();
    expect(composeSection()).not.toBeVisible();
    await user.click(tabButton('Compose'));
    expect(screen.getByLabelText('Draft')).toHaveValue('hello');
  });

  it('loses the state with conditional rendering', async () => {
    const user = userEvent.setup();
    render(<ActivityDemo />);
    await user.selectOptions(screen.getByLabelText('Hide inactive tabs with'), 'conditional');
    await user.type(screen.getByLabelText('Draft'), 'hello');
    await user.click(tabButton('Timer'));
    expect(composeSection()).toBeNull();
    await user.click(tabButton('Compose'));
    expect(screen.getByLabelText('Draft')).toHaveValue('');
  });

  it('mounts effects only while visible and cleans them up when hidden', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const user = userEvent.setup();
    render(<ActivityDemo />);
    // The hidden Timer tab is pre-rendered, but its Effects do not run.
    expect(effectLog()).not.toHaveTextContent('interval started');

    await user.click(tabButton('Timer'));
    expect(effectLog()).toHaveTextContent('Timer effect: interval started');
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText('Seconds while visible:')).toHaveTextContent('3');

    await user.click(tabButton('Compose'));
    expect(effectLog()).toHaveTextContent('Timer effect: cleaned up');
    act(() => vi.advanceTimersByTime(5000));
    await user.click(tabButton('Timer'));
    // State survived, and the clock did not advance while hidden.
    expect(screen.getByText('Seconds while visible:')).toHaveTextContent('3');
  });
});
