import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import SwrDemo from './SwrDemo';

describe('SwrDemo', () => {
  it('toggles optimistically and keeps the server result', async () => {
    let patched: unknown = null;
    server.use(
      http.patch('/api/todos/:id', async ({ request, params }) => {
        patched = await request.json();
        return HttpResponse.json({ id: params.id, title: 'Write a custom hook', completed: true });
      }),
    );
    const user = userEvent.setup();
    render(<SwrDemo />);
    const checkbox = await screen.findByLabelText('Write a custom hook');
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await waitFor(() => expect(patched).toEqual({ completed: true }));
    expect(screen.getByLabelText('Write a custom hook')).toBeChecked();
    expect(screen.queryByText('Optimistic update rolled back')).not.toBeInTheDocument();
  });

  it('rolls back when the server rejects the update', async () => {
    const user = userEvent.setup();
    render(<SwrDemo />);
    const checkbox = await screen.findByLabelText('Write a custom hook');
    await user.click(screen.getByLabelText('Simulate server failure'));
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(
      await screen.findByText('Rolled back "Write a custom hook": Update failed'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Write a custom hook')).not.toBeChecked();
  });

  it('uses an isolated cache per mount', async () => {
    server.use(http.get('/api/todos', () => HttpResponse.json([])));
    const { unmount } = render(<SwrDemo />);
    expect(await screen.findByText('Cached')).toBeInTheDocument();
    unmount();
    server.resetHandlers();
    render(<SwrDemo />);
    expect(await screen.findByLabelText('Write a custom hook')).toBeInTheDocument();
  });
});
