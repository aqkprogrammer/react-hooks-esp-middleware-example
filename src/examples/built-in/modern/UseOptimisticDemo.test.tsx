import { render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import UseOptimisticDemo from './UseOptimisticDemo';
import { createGate, leaveActEnvironment, typeNatively } from './testUtils';

const list = () => within(screen.getByRole('list', { name: 'Todo list' }));

async function renderLoaded() {
  render(<UseOptimisticDemo />);
  leaveActEnvironment();
  expect(await screen.findByText('Read the Rules of Hooks')).toBeInTheDocument();
}

function addTodo(title: string) {
  typeNatively(screen.getByLabelText<HTMLInputElement>('New todo'), title);
  screen.getByRole('button', { name: 'Add' }).click();
}

describe('UseOptimisticDemo', () => {
  it('shows the optimistic item, then rolls it back with an error message on failure', async () => {
    const gate = createGate();
    server.use(
      http.post('/api/todos', async () => {
        await gate.promise;
        return HttpResponse.json({ message: 'Server rejected "Please fail"' }, { status: 500 });
      }),
    );
    await renderLoaded();
    addTodo('Please fail');

    expect(await list().findByText('Please fail')).toBeInTheDocument();
    expect(list().getByText('Saving…')).toBeInTheDocument();
    expect(list().getAllByRole('listitem')).toHaveLength(4);

    gate.open();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not add “Please fail”: Server rejected "Please fail"',
    );
    await waitFor(() => expect(list().queryByText('Please fail')).toBeNull());
    expect(list().getAllByRole('listitem')).toHaveLength(3);
  });

  it('replaces the optimistic item with the saved one on success', async () => {
    const gate = createGate();
    server.use(
      http.post('/api/todos', async ({ request }) => {
        const { title } = (await request.json()) as { title: string };
        await gate.promise;
        return HttpResponse.json({ id: 't100', title, completed: false }, { status: 201 });
      }),
    );
    await renderLoaded();
    addTodo('Ship the demo');
    expect(await list().findByText('Saving…')).toBeInTheDocument();

    gate.open();
    await waitFor(() => expect(list().queryByText('Saving…')).toBeNull());
    expect(list().getByText('Ship the demo')).toBeInTheDocument();
    expect(list().getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses the default mock rule: titles containing "fail" are rejected', async () => {
    await renderLoaded();
    addTodo('fail loudly');
    expect(await list().findByText('fail loudly')).toBeInTheDocument();
    expect(await screen.findByRole('alert', {}, { timeout: 2000 })).toHaveTextContent(
      'Could not add “fail loudly”',
    );
    await waitFor(() => expect(list().queryByText('fail loudly')).toBeNull());
  });
});
