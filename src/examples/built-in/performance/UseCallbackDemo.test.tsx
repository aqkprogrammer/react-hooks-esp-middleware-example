import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseCallbackDemo from './UseCallbackDemo';

const listCommits = () => screen.getByText(/SelectableList commits:/);

describe('UseCallbackDemo', () => {
  it('skips the memo() child when the callback is stable', async () => {
    const user = userEvent.setup();
    render(<UseCallbackDemo />);
    expect(listCommits()).toHaveTextContent(/commits: 1 /);
    await user.type(screen.getByLabelText('Note (unrelated to the list)'), 'abc');
    expect(listCommits()).toHaveTextContent(/commits: 1 /);
  });

  it('re-renders the memo() child on every keystroke with an inline callback', async () => {
    const user = userEvent.setup();
    render(<UseCallbackDemo />);
    await user.click(screen.getByLabelText(/Wrap onSelect in useCallback/));
    expect(screen.getByText('new every render')).toBeInTheDocument();
    expect(listCommits()).toHaveTextContent(/commits: 2 /);
    await user.type(screen.getByLabelText('Note (unrelated to the list)'), 'abc');
    expect(listCommits()).toHaveTextContent(/commits: 5 /);
  });

  it('still re-renders the list when its own props change', async () => {
    const user = userEvent.setup();
    render(<UseCallbackDemo />);
    await user.click(screen.getByRole('button', { name: 'Grace #9' }));
    expect(screen.getByRole('button', { name: 'Grace #9' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('row 9')).toBeInTheDocument();
    expect(listCommits()).toHaveTextContent(/commits: 2 /);
  });
});
