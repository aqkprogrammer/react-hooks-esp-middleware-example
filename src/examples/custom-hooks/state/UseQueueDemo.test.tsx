import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseQueueDemo from './UseQueueDemo';

describe('UseQueueDemo', () => {
  it('enqueues and processes jobs in FIFO order', async () => {
    const user = userEvent.setup();
    render(<UseQueueDemo />);
    await user.click(screen.getByRole('button', { name: 'Enqueue job' }));
    const queued = screen.getByRole('list', { name: 'Queued jobs' });
    expect(within(queued).getAllByRole('listitem')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Process two at once' }));
    const log = screen.getByRole('log');
    expect(log).toHaveTextContent('Processed Job #1');
    expect(log).toHaveTextContent('Processed Job #2');
    expect(
      within(queued)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Job #3']);

    await user.click(screen.getByRole('button', { name: 'Peek' }));
    expect(log).toHaveTextContent('peek() → "Job #3"');

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Empty.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Process next' })).toBeDisabled();
  });
});
