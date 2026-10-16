import { useEffect, useState } from 'react';
import { Badge, Button, Callout, EventLog, Panel, useEventLog } from '../../../components/ui';
import { useOptimisticMutation } from '../../../hooks/advanced';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface Toggle {
  id: string;
  completed: boolean;
}

type LoadState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; todos: Todo[] };

const applyToggle = (todos: Todo[], { id, completed }: Toggle) =>
  todos.map((todo) => (todo.id === id ? { ...todo, completed } : todo));

function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [failServer, setFailServer] = useState(false);
  const { entries, log, clear } = useEventLog(20);

  const mutation = useOptimisticMutation<Todo[], Toggle, Todo>({
    initialState: initialTodos,
    mutationFn: async ({ id, completed }, signal) => {
      const response = await fetch(`/api/todos/${id}?delay=1200`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(failServer ? { 'x-fail': '1' } : {}) },
        body: JSON.stringify({ completed }),
        signal,
      });
      if (!response.ok) throw new Error(`Server rejected the change (${response.status})`);
      return (await response.json()) as Todo;
    },
    applyOptimistic: applyToggle,
    // Trust the server's version of the todo.
    applyResult: (todos, saved) => todos.map((todo) => (todo.id === saved.id ? saved : todo)),
    onSuccess: (saved) => log(`saved “${saved.title}”`, 'success'),
    onError: (error, toggle) => log(`rolled back ${toggle.id}: ${error.message}`, 'error'),
  });

  const pendingIds = new Set(mutation.pending.map((item) => item.variables.id));

  return (
    <div className="stack">
      <label className="row">
        <input
          type="checkbox"
          checked={failServer}
          onChange={(event) => setFailServer(event.target.checked)}
        />
        Make the server fail (rollback)
      </label>
      <ul className="list" aria-label="Todos">
        {mutation.state.map((todo) => (
          <li key={todo.id} className="spread">
            <label className="row">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={(event) => {
                  log(`toggle ${todo.id} → ${event.target.checked}`);
                  void mutation.mutate({ id: todo.id, completed: event.target.checked });
                }}
              />
              {todo.title}
            </label>
            {pendingIds.has(todo.id) ? <Badge tone="info">saving…</Badge> : null}
          </li>
        ))}
      </ul>
      <p className="small muted">
        {mutation.isPending
          ? `${mutation.pending.length} change(s) in flight — the UI already shows them.`
          : 'All changes confirmed by the server.'}
      </p>
      {mutation.error ? (
        <Callout tone="danger" title="Change rolled back">
          <div className="stack">
            <span>{mutation.error.message}</span>
            <Button size="sm" onClick={mutation.dismissError}>
              Dismiss
            </Button>
          </div>
        </Callout>
      ) : null}
      <EventLog entries={entries} onClear={clear} />
    </div>
  );
}

export default function UseOptimisticMutationDemo() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/todos', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setLoad({ status: 'ready', todos: ((await response.json()) as Todo[]).slice(0, 5) });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoad({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <Panel
      title="Todos with optimistic toggles"
      description="Each request takes ~1.2 s. Toggle several quickly, then make the server fail one: only that change is rolled back."
    >
      {load.status === 'loading' ? <p className="muted">Loading todos…</p> : null}
      {load.status === 'error' ? (
        <Callout tone="danger" title="Could not load todos">
          {load.message}
        </Callout>
      ) : null}
      {load.status === 'ready' ? <TodoList initialTodos={load.todos} /> : null}
    </Panel>
  );
}
