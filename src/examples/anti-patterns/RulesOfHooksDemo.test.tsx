import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import RulesOfHooksDemo from './RulesOfHooksDemo';

describe('RulesOfHooksDemo', () => {
  beforeEach(() => {
    document.title = 'Playground';
  });
  afterEach(() => {
    document.title = '';
  });

  it('runs the effect only while the condition inside it holds, and cleans up', async () => {
    const user = userEvent.setup();
    render(<RulesOfHooksDemo />);
    await user.type(screen.getByLabelText('Name'), 'Mary');
    expect(document.title).toBe('Editing Mary');
    await user.clear(screen.getByLabelText('Name'));
    expect(document.title).toBe('Playground');
  });

  it('unmounts the form instead of returning early before its Hooks', async () => {
    const user = userEvent.setup();
    render(<RulesOfHooksDemo />);
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('Please sign in.')).toBeInTheDocument();
    expect(document.title).toBe('Playground');
  });

  it('keeps per-item state with the right item after reordering', async () => {
    const user = userEvent.setup();
    render(<RulesOfHooksDemo />);
    await user.type(screen.getByLabelText('Note for Mary'), 'bring umbrella');
    await user.click(screen.getByRole('button', { name: 'Reverse list' }));
    expect(screen.getByLabelText('Note for Mary')).toHaveValue('bring umbrella');
    expect(screen.getByLabelText('Note for Poppins')).toHaveValue('');
  });

  it('reads context at the top level and uses it in the handler', async () => {
    const user = userEvent.setup();
    render(<RulesOfHooksDemo />);
    await user.click(screen.getByRole('button', { name: /Toggle theme context/ }));
    await user.click(screen.getByRole('button', { name: 'Save with dark theme (0)' }));
    expect(screen.getByRole('button', { name: 'Save with dark theme (1)' })).toBeInTheDocument();
  });
});
