import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseRetryDemo from './UseRetryDemo';

describe('UseRetryDemo', () => {
  it('retries the flaky endpoint and logs every attempt', async () => {
    const user = userEvent.setup();
    render(<UseRetryDemo />);
    await user.selectOptions(screen.getByLabelText('Server failures before success'), '1');
    await user.click(screen.getByRole('button', { name: 'Run request' }));
    const log = screen.getByRole('log', { name: 'Attempt log' });
    expect(
      await within(log).findByText(/Succeeded on attempt 2/, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(within(log).getByText(/Attempt 1 failed/)).toBeInTheDocument();
  });

  it('gives up when attempts run out', async () => {
    const user = userEvent.setup();
    render(<UseRetryDemo />);
    await user.selectOptions(screen.getByLabelText('Server failures before success'), '3');
    await user.selectOptions(screen.getByLabelText('Max attempts'), '1');
    await user.click(screen.getByRole('button', { name: 'Run request' }));
    const log = screen.getByRole('log', { name: 'Attempt log' });
    expect(await within(log).findByText(/Gave up/)).toBeInTheDocument();
  });

  it('can be cancelled while waiting', async () => {
    const user = userEvent.setup();
    render(<UseRetryDemo />);
    await user.selectOptions(screen.getByLabelText('Server failures before success'), '5');
    await user.click(screen.getByRole('button', { name: 'Run request' }));
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancel);
    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  });
});
