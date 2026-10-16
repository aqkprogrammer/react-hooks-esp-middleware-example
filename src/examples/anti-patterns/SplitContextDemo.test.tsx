import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import SplitContextDemo from './SplitContextDemo';

const commits = (label: string) => screen.getByText(`${label} commits:`, { exact: false });

describe('SplitContextDemo', () => {
  it('re-renders every consumer of the single context on each keystroke', async () => {
    const user = userEvent.setup();
    render(<SplitContextDemo />);
    await user.type(screen.getByLabelText('Search (single context)'), 'abc');
    expect(commits('Single · Avatar')).toHaveTextContent(/commits: 4 /);
    expect(commits('Single · Theme')).toHaveTextContent(/commits: 4 /);
    expect(commits('Single · Search')).toHaveTextContent(/commits: 4 /);
  });

  it('re-renders only the search consumer with split contexts', async () => {
    const user = userEvent.setup();
    render(<SplitContextDemo />);
    await user.type(screen.getByLabelText('Search (split contexts)'), 'abc');
    expect(commits('Split · Avatar')).toHaveTextContent(/commits: 1 /);
    expect(commits('Split · Theme')).toHaveTextContent(/commits: 1 /);
    expect(commits('Split · Search')).toHaveTextContent(/commits: 4 /);

    await user.click(screen.getByRole('button', { name: 'Theme (split): light' }));
    expect(commits('Split · Theme')).toHaveTextContent(/commits: 2 /);
    expect(commits('Split · Search')).toHaveTextContent(/commits: 4 /);
  });
});
