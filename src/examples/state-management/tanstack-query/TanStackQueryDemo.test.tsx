import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import TanStackQueryDemo from './TanStackQueryDemo';

const todos = () => within(screen.getByRole('list', { name: 'Todos' }));

describe('TanStackQueryDemo', () => {
  it('adds a todo optimistically and keeps it after the server confirms', async () => {
    const user = userEvent.setup();
    render(<TanStackQueryDemo />);
    expect(await todos().findByText('Write a custom hook')).toBeInTheDocument();
    await user.type(screen.getByLabelText('New todo'), 'Buy milk{Enter}');
    // Visible before the 400 ms POST resolves.
    expect(await todos().findByText('Buy milk')).toBeInTheDocument();
    expect(todos().getByText('saving…')).toBeInTheDocument();
    await waitFor(() => expect(todos().queryByText('saving…')).not.toBeInTheDocument());
    expect(todos().getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByLabelText('New todo')).toHaveValue('');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Up to date'));
  });

  it('rolls the optimistic todo back when the server fails', async () => {
    const user = userEvent.setup();
    render(<TanStackQueryDemo />);
    await todos().findByText('Write a custom hook');
    await user.type(screen.getByLabelText('New todo'), 'please fail{Enter}');
    expect(await todos().findByText('please fail')).toBeInTheDocument();
    expect(
      await screen.findByText('"please fail" was rolled back: Server rejected "please fail"'),
    ).toBeInTheDocument();
    expect(todos().queryByText('please fail')).not.toBeInTheDocument();
    expect(todos().getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByLabelText('New todo')).toHaveValue('please fail');
  });

  it('shows query errors without retrying', async () => {
    let calls = 0;
    server.use(
      http.get('/api/todos', () => {
        calls += 1;
        return HttpResponse.json({ message: 'DB down' }, { status: 503 });
      }),
    );
    render(<TanStackQueryDemo />);
    expect(await screen.findByText('DB down')).toBeInTheDocument();
    expect(calls).toBe(1);
  });
});
