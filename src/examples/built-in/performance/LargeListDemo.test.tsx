import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import LargeListDemo from './LargeListDemo';

// Role queries over 5,000 rows are slow in jsdom; a plain selector is enough here.
const bodyRows = () => Array.from(document.querySelectorAll('tbody tr'));

describe('LargeListDemo', () => {
  it('renders 5,000 rows and can switch to 500', async () => {
    const user = userEvent.setup();
    render(<LargeListDemo />);
    expect(bodyRows()).toHaveLength(5000);
    await user.selectOptions(screen.getByLabelText('Rows'), '500');
    expect(bodyRows()).toHaveLength(500);
  });

  it('sorts by score and reports commits through the Profiler', async () => {
    const user = userEvent.setup();
    render(<LargeListDemo />);
    await user.selectOptions(screen.getByLabelText('Rows'), '500');
    await user.click(screen.getByRole('button', { name: 'Sort by score' }));
    expect(screen.getByRole('table', { name: '500 people sorted by score' })).toBeInTheDocument();
    const scores = bodyRows().map((row) => Number(row.lastElementChild?.textContent));
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    await user.click(screen.getByRole('button', { name: /Unrelated re-render/ }));
    expect(screen.getByText(/Table commits:/)).toHaveTextContent(/commits: 4 /);
  });
});
