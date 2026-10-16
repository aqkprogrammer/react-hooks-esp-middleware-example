import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseAsyncFnDemo from './UseAsyncFnDemo';

describe('UseAsyncFnDemo', () => {
  it('creates a todo on submit', async () => {
    const user = userEvent.setup();
    render(<UseAsyncFnDemo />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const created = await screen.findByText('Write the docs');
    expect(created.closest('li')).toHaveTextContent('t100');
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('shows the server error', async () => {
    const user = userEvent.setup();
    render(<UseAsyncFnDemo />);
    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'please fail');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const title500 = await screen.findByText('Save failed');
    expect(title500.closest('[role="note"]')).toHaveTextContent(
      'HTTP 500: Server rejected "please fail" (status 500)',
    );
  });

  it('cancels a slow save', async () => {
    const user = userEvent.setup();
    render(<UseAsyncFnDemo />);
    await user.click(screen.getByLabelText(/Slow server/));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    const log = screen.getByRole('log');
    expect(await within(log).findByText(/Superseded or cancelled/)).toBeInTheDocument();
  });
});
