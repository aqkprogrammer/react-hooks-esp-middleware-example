import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import MemoizationPitfallsDemo from './MemoizationPitfallsDemo';

const runs = () =>
  within(screen.getByRole('table', { name: 'Effect runs per dependency list' }))
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

describe('MemoizationPitfallsDemo', () => {
  it('re-runs an effect with an object literal dependency on every render', async () => {
    const user = userEvent.setup();
    render(<MemoizationPitfallsDemo />);
    expect(runs()).toEqual(['1', '1', '1']);
    await user.click(screen.getByRole('button', { name: 'Unrelated re-render' }));
    await user.click(screen.getByRole('button', { name: 'Unrelated re-render' }));
    expect(runs()).toEqual(['1', '3', '1']);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(runs()).toEqual(['2', '4', '2']);
  });

  it('shows memo() re-rendering when an inline object prop is passed', async () => {
    const user = userEvent.setup();
    render(<MemoizationPitfallsDemo />);
    await user.click(screen.getByRole('button', { name: 'Unrelated re-render' }));
    expect(screen.getByText(/inline commits:/)).toHaveTextContent(/commits: 2 /);
    expect(screen.getByText(/constant commits:/)).toHaveTextContent(/commits: 1 /);
  });
});
