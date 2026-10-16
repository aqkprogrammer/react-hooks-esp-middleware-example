import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import ReduxToolkitDemo from './ReduxToolkitDemo';

const todos = () => within(screen.getByRole('list', { name: 'Todos' }));
const notifications = () => within(screen.getByRole('list', { name: 'Notifications' }));

describe('ReduxToolkitDemo', () => {
  it('loads todos with a thunk and adds one through the API', async () => {
    const user = userEvent.setup();
    render(<ReduxToolkitDemo />);
    expect(await todos().findByText('Write a custom hook')).toBeInTheDocument();
    await user.type(screen.getByLabelText('New todo'), 'Ship the demo');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await todos().findByText('Ship the demo')).toBeInTheDocument();
    expect(screen.getByLabelText('New todo')).toHaveValue('');
    expect(notifications().getByText('Success: Added "Ship the demo"')).toBeInTheDocument();
    expect(screen.getByRole('log', { name: 'Audit log (custom middleware)' })).toHaveTextContent(
      'todos/add/fulfilled → 4 todo(s)',
    );
  });

  it('shows a listener notification and keeps the input when the server rejects', async () => {
    const user = userEvent.setup();
    render(<ReduxToolkitDemo />);
    await todos().findByText('Write a custom hook');
    await user.type(screen.getByLabelText('New todo'), 'please fail');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(
      await notifications().findByText('Error: Server rejected "please fail"'),
    ).toBeInTheDocument();
    expect(todos().queryByText('please fail')).not.toBeInTheDocument();
    expect(screen.getByLabelText('New todo')).toHaveValue('please fail');
    await user.click(
      screen.getByRole('button', { name: 'Dismiss: Server rejected "please fail"' }),
    );
    expect(notifications().getByText('No notifications.')).toBeInTheDocument();
  });

  it('filters with a memoised selector and toggles locally', async () => {
    const user = userEvent.setup();
    render(<ReduxToolkitDemo />);
    await todos().findByText('Write a custom hook');
    await user.click(screen.getByLabelText('Write a custom hook'));
    await user.click(screen.getByRole('button', { name: 'done' }));
    expect(todos().getAllByRole('checkbox')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'active' }));
    expect(todos().getByText('Test effect cleanup')).toBeInTheDocument();
    expect(todos().queryByText('Write a custom hook')).not.toBeInTheDocument();
  });

  it('reports a failed load', async () => {
    server.use(
      http.get('/api/todos', () => HttpResponse.json({ message: 'DB down' }, { status: 503 })),
    );
    render(<ReduxToolkitDemo />);
    expect(await screen.findByText('DB down')).toBeInTheDocument();
  });
});
