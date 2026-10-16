import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ProfilerDemo from './ProfilerDemo';

const sampleRows = () =>
  within(screen.getByRole('table', { name: 'Profiler samples' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .slice(0, 2)
        .map((cell) => cell.textContent)
        .join(' / '),
    );

describe('ProfilerDemo', () => {
  it('records a mount sample for each profiled subtree', () => {
    render(<ProfilerDemo />);
    expect(sampleRows()).toEqual(['Counter / mount', 'Search panel / mount']);
  });

  it('records update samples only for the subtree that re-rendered', async () => {
    const user = userEvent.setup();
    render(<ProfilerDemo />);
    await user.click(screen.getByRole('button', { name: 'Increment (0)' }));
    expect(sampleRows()[0]).toBe('Counter / update');
    await user.type(screen.getByLabelText('Profiled search'), 'a');
    expect(sampleRows().slice(0, 2)).toEqual(['Search panel / update', 'Counter / update']);
    expect(sampleRows()).toHaveLength(4);
  });

  it('clears the samples without feeding back into the profiled tree', async () => {
    const user = userEvent.setup();
    render(<ProfilerDemo />);
    await user.click(screen.getByRole('button', { name: 'Clear samples' }));
    expect(screen.getByText('No commits recorded yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear samples' })).toBeDisabled();
  });
});
