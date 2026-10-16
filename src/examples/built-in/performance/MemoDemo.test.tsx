import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import MemoDemo from './MemoDemo';

const commits = (label: string) => screen.getByText(`${label} commits:`, { exact: false });

describe('MemoDemo', () => {
  it('skips both memoised charts when only the parent re-renders', async () => {
    const user = userEvent.setup();
    render(<MemoDemo />);
    await user.click(screen.getByRole('button', { name: 'Re-render parent only' }));
    expect(commits('Plain component')).toHaveTextContent(/commits: 2 /);
    expect(commits('memo(Chart)')).toHaveTextContent(/commits: 1 /);
    expect(commits('memo(Chart, arePropsEqual)')).toHaveTextContent(/commits: 1 /);
  });

  it('only the custom comparison skips an equal copy of the array', async () => {
    const user = userEvent.setup();
    render(<MemoDemo />);
    await user.click(screen.getByRole('button', { name: 'Replace data with an equal copy' }));
    expect(commits('Plain component')).toHaveTextContent(/commits: 2 /);
    expect(commits('memo(Chart)')).toHaveTextContent(/commits: 2 /);
    expect(commits('memo(Chart, arePropsEqual)')).toHaveTextContent(/commits: 1 /);
  });

  it('re-renders every chart when the data really changes', async () => {
    const user = userEvent.setup();
    render(<MemoDemo />);
    await user.click(screen.getByRole('button', { name: 'Change the first value' }));
    expect(commits('memo(Chart, arePropsEqual)')).toHaveTextContent(/commits: 2 /);
    const meters = screen.getAllByRole('meter', { name: 'Point 1' });
    for (const meter of meters) expect(meter).toHaveAttribute('value', '29');
  });
});
