import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import { server } from '../../../test/server';
import { createGate, leaveActEnvironment, typeNatively } from './actionTestUtils';
import FormActionsOptimisticScenario from './FormActionsOptimisticScenario';

const list = () => within(screen.getByRole('list', { name: 'Todos' }));
const input = () => screen.getByLabelText<HTMLInputElement>('New todo');

async function renderLoaded() {
  render(<FormActionsOptimisticScenario />);
  leaveActEnvironment();
  expect(await screen.findByText('Read the Rules of Hooks')).toBeInTheDocument();
}

function submit(title: string) {
  typeNatively(input(), title);
  screen.getByRole('button', { name: 'Add todo' }).click();
}

describe('FormActionsOptimisticScenario', () => {
  it('shows the optimistic todo and a pending submit button, then confirms it', async () => {
    const gate = createGate();
    server.use(
      http.post('/api/todos', async ({ request }) => {
        const { title } = (await request.json()) as { title: string };
        await gate.promise;
        return HttpResponse.json({ id: 't100', title, completed: false }, { status: 201 });
      }),
    );
    await renderLoaded();
    submit('Ship the scenario');

    expect(await list().findByText('Ship the scenario')).toBeInTheDocument();
    expect(list().getByText('Saving…')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Todos' })).toHaveAttribute('aria-busy', 'true');
    const button = await screen.findByRole('button', { name: 'Adding…' });
    expect(button).toBeDisabled();
    expect(screen.getByText('Saving “Ship the scenario”…')).toBeInTheDocument();

    gate.open();
    await waitFor(() => expect(list().queryByText('Saving…')).toBeNull());
    expect(list().getAllByRole('listitem')).toHaveLength(4);
    expect(list().getByText('Ship the scenario')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add todo' })).toBeEnabled();
    expect(screen.getByText('Saved “Ship the scenario”.')).toBeInTheDocument();
    expect(input()).toHaveValue('');
  });

  it('rolls the optimistic todo back on a 500, shows the error and restores the text', async () => {
    const gate = createGate();
    server.use(
      http.post('/api/todos', async () => {
        await gate.promise;
        return HttpResponse.json({ message: 'Server rejected "please fail"' }, { status: 500 });
      }),
    );
    await renderLoaded();
    submit('please fail');
    expect(await list().findByText('please fail')).toBeInTheDocument();
    expect(list().getAllByRole('listitem')).toHaveLength(4);

    gate.open();
    expect(
      await screen.findByText('Could not add “please fail”: Server rejected "please fail"'),
    ).toHaveAttribute('role', 'alert');
    await waitFor(() => expect(list().queryByText('please fail')).toBeNull());
    expect(list().getAllByRole('listitem')).toHaveLength(3);
    await waitFor(() => expect(input()).toHaveValue('please fail'));
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input()).toHaveAccessibleDescription(/Could not add/);
  });

  it('uses the real mock rule: titles containing "fail" are rejected', async () => {
    await renderLoaded();
    submit('fail loudly');
    expect(await list().findByText('fail loudly')).toBeInTheDocument();
    expect(
      await screen.findByText(/Could not add “fail loudly”/, {}, { timeout: 2000 }),
    ).toBeVisible();
    await waitFor(() => expect(list().queryByText('fail loudly')).toBeNull());
  });

  it('validates an empty title without sending a request or adding an optimistic item', async () => {
    let posted = false;
    server.use(
      http.post('/api/todos', () => {
        posted = true;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    await renderLoaded();
    submit('   ');
    expect(await screen.findByText('Enter a title for the todo.')).toBeInTheDocument();
    expect(list().getAllByRole('listitem')).toHaveLength(3);
    expect(posted).toBe(false);
  });

  it('shows a load error with a working retry', async () => {
    let fail = true;
    server.use(
      http.get('/api/todos', () =>
        fail
          ? HttpResponse.json({ message: 'Todo service down' }, { status: 503 })
          : HttpResponse.json([{ id: 't1', title: 'Recovered', completed: false }]),
      ),
    );
    const user = userEvent.setup();
    render(<FormActionsOptimisticScenario />);
    expect(await screen.findByText('Could not load todos: Todo service down')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Recovered')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<FormActionsOptimisticScenario />);
    expect(await screen.findByText('Read the Rules of Hooks')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
