import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import RefsInRenderDemo from './RefsInRenderDemo';

const value = (label: string) => screen.getByText(label).nextElementSibling;

describe('RefsInRenderDemo', () => {
  it('renders click stats from state and keeps the last click time in a ref', async () => {
    const user = userEvent.setup();
    render(<RefsInRenderDemo />);
    expect(value('Time between last two clicks')).toHaveTextContent('—');
    await user.click(screen.getByRole('button', { name: 'Click' }));
    expect(value('Clicks')).toHaveTextContent('1');
    expect(value('Time between last two clicks')).toHaveTextContent('—');
    await user.click(screen.getByRole('button', { name: 'Click' }));
    expect(value('Clicks')).toHaveTextContent('2');
    expect(value('Time between last two clicks')).toHaveTextContent(/^\d+ ms$/);
  });

  it('counts commits from an effect without causing renders', async () => {
    const user = userEvent.setup();
    render(<RefsInRenderDemo />);
    const commits = () => screen.getByText(/Commits \(written to the DOM/).querySelector('span');
    expect(commits()).toHaveTextContent('1');
    await user.click(screen.getByRole('button', { name: 'Click' }));
    expect(commits()).toHaveTextContent('2');
  });

  it('uses a DOM ref from an event handler', async () => {
    const user = userEvent.setup();
    render(<RefsInRenderDemo />);
    await user.click(screen.getByRole('button', { name: 'Focus the comment field' }));
    expect(screen.getByLabelText('Comment')).toHaveFocus();
  });
});
