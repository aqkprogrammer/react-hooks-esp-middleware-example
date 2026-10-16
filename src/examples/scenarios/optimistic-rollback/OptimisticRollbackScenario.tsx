import { useState, type FormEvent } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { useFetch, useOptimisticMutation } from '../../../hooks';
import {
  applyOptimistic,
  applyResult,
  describeMutation,
  sendTodoMutation,
  type Todo,
  type TodoMutation,
} from './todoMutations';
import './OptimisticRollbackScenario.css';

let tempIds = 0;

/**
 * Optimistic todos against `/api/todos`: every change shows up immediately,
 * is marked as pending until the server answers and is rolled back (with a
 * message) if the server rejects it.
 */
export default function OptimisticRollbackScenario() {
  // Bumping the key refetches and starts the optimistic layer from scratch.
  const [generation, setGeneration] = useState(0);
  return (
    <div className="stack">
      <TodoLoader key={generation} onReload={() => setGeneration((value) => value + 1)} />
      <Callout title="How this relates to React 19 useOptimistic">
        <code>useOptimistic</code> shows an optimistic value only while an Action (a transition or{' '}
        <code>{'<form action>'}</code>) is pending and falls back to the real state when it ends, so
        “rollback” is automatic. This list mutates state owned by a hook, outside any transition, so
        it uses <code>useOptimisticMutation</code> — the same model (confirmed state + pending
        changes replayed on top), with explicit success/failure. The <code>useOptimistic</code> page
        shows the form-action version.
      </Callout>
    </div>
  );
}

function TodoLoader({ onReload }: { onReload: () => void }) {
  const todos = useFetch<Todo[]>('/api/todos');
  if (todos.status === 'error') {
    return (
      <Callout tone="danger" title="Could not load todos">
        <div className="row">
          <span>{todos.error.message}</span>
          <Button size="sm" onClick={todos.reload}>
            Retry
          </Button>
        </div>
      </Callout>
    );
  }
  if (todos.status !== 'success') return <p className="muted">Loading todos…</p>;
  return <OptimisticTodoList initialTodos={todos.data} onReload={onReload} />;
}

function OptimisticTodoList({
  initialTodos,
  onReload,
}: {
  initialTodos: Todo[];
  onReload: () => void;
}) {
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [failWrites, setFailWrites] = useState(false);
  const [rollback, setRollback] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState('');

  const todos = useOptimisticMutation<Todo[], TodoMutation, Todo | null>({
    initialState: initialTodos,
    mutationFn: sendTodoMutation,
    applyOptimistic,
    applyResult,
    onSuccess: (_result, mutation) => setConfirmation(`Saved: ${describeMutation(mutation)}.`),
    onError: (error, mutation) =>
      setRollback(`Could not ${describeMutation(mutation)} — ${error.message}. Change undone.`),
  });

  const pendingIds = new Set(
    todos.pending.map(({ variables }) =>
      variables.kind === 'add' ? variables.tempId : variables.id,
    ),
  );
  const pendingAdds = new Set(
    todos.pending.flatMap(({ variables }) => (variables.kind === 'add' ? [variables.tempId] : [])),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Enter a title.');
      return;
    }
    setTitleError(null);
    setTitle('');
    tempIds += 1;
    void todos.mutate({ kind: 'add', tempId: `temp-${tempIds}`, title: trimmed });
  };

  const remaining = todos.state.filter((todo) => !todo.completed).length;

  return (
    <Panel
      title="Todos"
      description="Changes appear instantly. Pending ones are marked until the server confirms them."
    >
      <form className="optimistic-rollback-form" onSubmit={submit} noValidate>
        <TextField
          label="New todo"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={titleError}
          hint="Include “fail” in the title and the server rejects it (HTTP 500)."
        />
        <Button type="submit" variant="primary">
          Add
        </Button>
      </form>

      <label className="row small">
        <input
          type="checkbox"
          checked={failWrites}
          onChange={(event) => setFailWrites(event.target.checked)}
        />
        Make toggles and deletes fail (sends <code>x-fail: 1</code>)
      </label>

      {rollback ? (
        <Callout tone="danger" title="Change rolled back">
          <div className="row">
            <span role="alert">{rollback}</span>
            <Button size="sm" variant="ghost" onClick={() => setRollback(null)}>
              Dismiss
            </Button>
          </div>
        </Callout>
      ) : null}

      {todos.state.length === 0 ? (
        <p className="muted">Nothing to do.</p>
      ) : (
        <ul className="list optimistic-rollback-list" aria-label="Todos">
          {todos.state.map((todo) => {
            const pending = pendingIds.has(todo.id);
            const notOnServerYet = pendingAdds.has(todo.id);
            return (
              <li
                key={todo.id}
                aria-busy={pending}
                className={[
                  'optimistic-rollback-item',
                  pending ? 'optimistic-rollback-pending' : '',
                ].join(' ')}
              >
                <label className="row optimistic-rollback-label">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    disabled={notOnServerYet}
                    onChange={() =>
                      void todos.mutate({
                        kind: 'toggle',
                        id: todo.id,
                        title: todo.title,
                        completed: !todo.completed,
                        fail: failWrites,
                      })
                    }
                  />
                  <span className={todo.completed ? 'optimistic-rollback-done' : undefined}>
                    {todo.title}
                  </span>
                </label>
                <div className="row">
                  {pending ? <Badge tone="info">Saving…</Badge> : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${todo.title}`}
                    disabled={notOnServerYet}
                    onClick={() =>
                      void todos.mutate({
                        kind: 'delete',
                        id: todo.id,
                        title: todo.title,
                        fail: failWrites,
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="spread small">
        <span>
          {remaining} of {todos.state.length} left · {todos.pending.length} in flight · server has{' '}
          {todos.confirmedState.length}
        </span>
        <Button size="sm" onClick={onReload} disabled={todos.isPending}>
          Reload from server
        </Button>
      </div>
      <p role="status" className="visually-hidden">
        {confirmation}
      </p>
    </Panel>
  );
}
