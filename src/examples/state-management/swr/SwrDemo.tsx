import { useState } from 'react';
import useSWR, { SWRConfig, useSWRConfig } from 'swr';
import { Button, Callout, Panel } from '../../../components/ui';
import { errorMessage, fetchTodos, updateTodo, type Todo } from '../shared/todosApi';

const TODOS_KEY = '/api/todos';

/**
 * SWR: the URL is the cache key, `useSWR` returns cached data then
 * revalidates, and `mutate` applies an optimistic PATCH that rolls back on
 * failure. `provider: () => new Map()` gives this demo its own cache.
 */
export default function SwrDemo() {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        // The default retries failed requests with back-off; off for the demo.
        shouldRetryOnError: false,
      }}
    >
      <Panel title="Todos" description="useSWR + optimistic mutate with rollbackOnError">
        <TodosWithSwr />
      </Panel>
    </SWRConfig>
  );
}

function TodosWithSwr() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(TODOS_KEY, () => fetchTodos());
  const { mutate } = useSWRConfig();
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const toggle = async (todo: Todo) => {
    setFailure(null);
    const completed = !todo.completed;
    try {
      await mutate<Todo[], Todo>(
        TODOS_KEY,
        updateTodo(todo.id, { completed }, { simulateFailure }),
        {
          // Shown immediately, while the PATCH is in flight.
          optimisticData: (current = []) =>
            current.map((item) => (item.id === todo.id ? { ...item, completed } : item)),
          // Merge the server's response into the cached list...
          populateCache: (saved, current = []) =>
            current.map((item) => (item.id === saved.id ? saved : item)),
          // ...so no refetch is needed; on error, restore the previous data.
          revalidate: false,
          rollbackOnError: true,
        },
      );
    } catch (mutationError) {
      setFailure(`Rolled back "${todo.title}": ${errorMessage(mutationError)}`);
    }
  };

  return (
    <div className="stack">
      <div className="row">
        <label className="row">
          <input
            type="checkbox"
            checked={simulateFailure}
            onChange={(event) => setSimulateFailure(event.target.checked)}
          />
          Simulate server failure
        </label>
        <Button size="sm" onClick={() => void revalidate()} disabled={isValidating}>
          Revalidate
        </Button>
        <span className="small muted" role="status">
          {isLoading ? 'Loading…' : isValidating ? 'Revalidating…' : 'Cached'}
        </span>
      </div>
      {error ? (
        <Callout tone="danger" title="Could not load todos">
          {errorMessage(error)}
        </Callout>
      ) : null}
      {failure ? (
        <Callout tone="warn" title="Optimistic update rolled back">
          {failure}
        </Callout>
      ) : null}
      <ul className="list" aria-label="Todos">
        {data?.map((todo) => (
          <li key={todo.id}>
            <label className="row">
              <input type="checkbox" checked={todo.completed} onChange={() => void toggle(todo)} />
              {todo.title}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
