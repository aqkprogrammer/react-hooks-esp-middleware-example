import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import UseFetchDemo from './UseFetchDemo';

describe('UseFetchDemo', () => {
  it('never shows the slow, stale user after switching quickly', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/users/:id', async ({ params }) => {
        await delay(params.id === '1' ? 300 : 20);
        const names: Record<string, string> = { '1': 'Ada Lovelace', '2': 'Grace Hopper' };
        return HttpResponse.json({
          id: Number(params.id),
          name: names[String(params.id)] ?? 'Someone',
          email: 'x@example.com',
          role: 'viewer',
        });
      }),
    );
    render(<UseFetchDemo />);
    // Ada (slow) is selected initially; switch to Grace before Ada answers.
    await user.click(screen.getByRole('button', { name: 'Grace (fast)' }));
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('shows a typed 404 error with a retry button', async () => {
    const user = userEvent.setup();
    render(<UseFetchDemo />);
    await user.click(screen.getByRole('button', { name: 'Missing user (404)' }));
    const note = await screen.findByRole('note');
    expect(within(note).getByText('HTTP 404')).toBeInTheDocument();
    expect(within(note).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('is idle when no user is selected', async () => {
    const user = userEvent.setup();
    render(<UseFetchDemo />);
    await user.click(screen.getByRole('button', { name: 'None (url = null)' }));
    expect(screen.getByText('No user selected.')).toBeInTheDocument();
  });
});
