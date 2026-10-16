import { startTransition, useEffect, useOptimistic, useState } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { createTodo, errorMessage, fetchTodos, type Todo } from './api';

interface ListedTodo extends Todo {
  /** True only for the optimistic placeholder while the request is in flight. */
  pending?: boolean;
}

/**
 * `useOptimistic` shows the expected result of an Action immediately. The
 * optimistic value exists only while the Action is running: when it settles,
 * React renders the real state again — which contains the saved todo on
 * success, and does not on failure (an automatic rollback).
 */
export default function UseOptimisticDemo() {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [optimisticTodos, addOptimisticTodo] = useOptimistic<ListedTodo[], string>(
    todos ?? [],
    (current, title) => [
      ...current,
      { id: `optimistic:${title}`, title, completed: false, pending: true },
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchTodos(controller.signal).then(
      (loaded) => setTodos(loaded),
      (error: unknown) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      },
    );
    return () => controller.abort();
  }, []);

  // A form action runs inside a transition, which is what useOptimistic requires.
  async function addTodo(formData: FormData) {
    const title = String(formData.get('title') ?? '').trim();
    if (!title) return;
    setSaveError(null);
    addOptimisticTodo(title);
    try {
      const saved = await createTodo(title);
      // State set after `await` needs its own startTransition to stay part of the Action.
      startTransition(() => setTodos((current) => [...(current ?? []), saved]));
    } catch (error) {
      setSaveError(`Could not add “${title}”: ${errorMessage(error)}`);
    }
  }

  return (
    <div className="stack">
      <Panel
        title="Todos"
        description="Add a todo — it appears instantly. Include the word “fail” to make the server return 500 and watch it roll back."
      >
        <form action={addTodo} className="row">
          <TextField
            label="New todo"
            name="title"
            placeholder="e.g. Ship it (or: fail on purpose)"
          />
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
        {saveError ? (
          <p role="alert" className="field-error">
            {saveError}
          </p>
        ) : null}
        {loadError ? <p role="alert">Could not load todos: {loadError}</p> : null}
        {todos === null && !loadError ? <p role="status">Loading todos…</p> : null}
        <ul className="list" aria-label="Todo list">
          {optimisticTodos.map((todo) => (
            <li key={todo.id} className="spread">
              <span className={todo.pending ? 'muted' : undefined}>{todo.title}</span>
              {todo.pending ? <Badge tone="warn">Saving…</Badge> : null}
            </li>
          ))}
        </ul>
      </Panel>
      <Callout title="Rollback is free, the error message is not">
        React discards the optimistic item when the Action ends, but it cannot know <em>why</em>
        it ended — catch the error and show it, as above.
      </Callout>
    </div>
  );
}
