import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import OptimisticRollbackScenario from './OptimisticRollbackScenario';
import { applyOptimistic, applyResult, type Todo } from './todoMutations';

async function setup() {
  const user = userEvent.setup();
  render(<OptimisticRollbackScenario />);
  const list = await screen.findByRole('list', { name: 'Todos' });
  return { user, list };
}

const item = (list: HTMLElement, title: string) =>
  within(list).getByText(title).closest('li') as HTMLElement;

describe('OptimisticRollbackScenario', () => {
  it('shows an added todo immediately, marks it pending, then confirms it', async () => {
    const { user, list } = await setup();
    await user.type(screen.getByLabelText('New todo'), 'Buy milk{Enter}');

    const added = item(list, 'Buy milk');
    expect(added).toHaveAttribute('aria-busy', 'true');
    expect(within(added).getByText('Saving…')).toBeInTheDocument();
    expect(within(added).getByRole('checkbox')).toBeDisabled();
    expect(screen.getByLabelText('New todo')).toHaveValue('');

    await waitFor(() => expect(item(list, 'Buy milk')).toHaveAttribute('aria-busy', 'false'));
    expect(screen.getByText(/server has 4/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved: add “Buy milk”.');
  });

  it('rolls back a rejected add and explains why', async () => {
    const { user, list } = await setup();
    await user.type(screen.getByLabelText('New todo'), 'This will fail{Enter}');
    expect(within(list).getByText('This will fail')).toBeInTheDocument();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not add “This will fail” — HTTP 500: Server rejected "This will fail". Change undone.',
    );
    expect(within(list).queryByText('This will fail')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rolls back a failed toggle (PATCH with x-fail: 1)', async () => {
    const { user, list } = await setup();
    await user.click(screen.getByLabelText(/Make toggles and deletes fail/));
    const checkbox = within(item(list, 'Write a custom hook')).getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not mark “Write a custom hook” as done — HTTP 500: Update failed.',
    );
    expect(checkbox).not.toBeChecked();
  });

  it('confirms a successful toggle', async () => {
    const { user, list } = await setup();
    const checkbox = within(item(list, 'Write a custom hook')).getByRole('checkbox');
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await waitFor(() =>
      expect(item(list, 'Write a custom hook')).toHaveAttribute('aria-busy', 'false'),
    );
    expect(checkbox).toBeChecked();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('restores a todo whose delete failed', async () => {
    const { user, list } = await setup();
    await user.click(screen.getByLabelText(/Make toggles and deletes fail/));
    await user.click(screen.getByRole('button', { name: 'Delete Test effect cleanup' }));
    expect(within(list).queryByText('Test effect cleanup')).not.toBeInTheDocument();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete');
    expect(within(list).getByText('Test effect cleanup')).toBeInTheDocument();
  });

  it('deletes for real and keeps it deleted after a reload', async () => {
    const { user, list } = await setup();
    await user.click(screen.getByRole('button', { name: 'Delete Test effect cleanup' }));
    await waitFor(() => expect(screen.getByText(/server has 2/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Reload from server' }));
    const reloaded = await screen.findByRole('list', { name: 'Todos' });
    expect(reloaded).not.toBe(list);
    expect(within(reloaded).queryByText('Test effect cleanup')).not.toBeInTheDocument();
    expect(within(reloaded).getAllByRole('listitem')).toHaveLength(2);
  });

  it('validates an empty title without sending anything', async () => {
    const { user, list } = await setup();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Enter a title.')).toBeInTheDocument();
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });
});

describe('todo mutation reducers', () => {
  const todos: Todo[] = [{ id: 'a', title: 'A', completed: false }];

  it('replaces the temporary item with the server item on success', () => {
    const mutation = { kind: 'add', tempId: 'temp-1', title: 'B' } as const;
    expect(applyOptimistic(todos, mutation).at(-1)?.id).toBe('temp-1');
    expect(applyResult(todos, { id: 't9', title: 'B', completed: false }, mutation)).toEqual([
      ...todos,
      { id: 't9', title: 'B', completed: false },
    ]);
  });
});
