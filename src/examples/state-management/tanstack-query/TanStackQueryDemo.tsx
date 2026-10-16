import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { createTodo, errorMessage, fetchTodos, type Todo } from '../shared/todosApi';

const todosKey = ['todos'] as const;
const OPTIMISTIC_PREFIX = 'optimistic-';

/**
 * Server state with TanStack Query v5: a cached query, and a mutation that
 * updates the cache optimistically, rolls back on error and re-syncs with
 * the server by invalidating the query.
 */
export default function TanStackQueryDemo() {
  // One client per mounted demo, so the cache never leaks between mounts or tests.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // The default is 3 retries with exponential back-off; off here so
          // failures show immediately (and tests stay fast).
          queries: { retry: false, staleTime: 10_000 },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Panel title="Todos" description="useQuery + useMutation with an optimistic update">
        <Todos />
      </Panel>
    </QueryClientProvider>
  );
}

function Todos() {
  const queryClient = useQueryClient();
  const todos = useQuery({
    queryKey: todosKey,
    queryFn: ({ signal }) => fetchTodos(signal),
  });
  const [title, setTitle] = useState('');
  const [rollback, setRollback] = useState<string | null>(null);

  const addTodo = useMutation({
    mutationFn: (newTitle: string) => createTodo(newTitle),
    onMutate: async (newTitle) => {
      setRollback(null);
      // Stop in-flight refetches from overwriting the optimistic entry.
      await queryClient.cancelQueries({ queryKey: todosKey });
      const previous = queryClient.getQueryData<Todo[]>(todosKey);
      queryClient.setQueryData<Todo[]>(todosKey, (old = []) => [
        ...old,
        { id: `${OPTIMISTIC_PREFIX}${newTitle}`, title: newTitle, completed: false },
      ]);
      return { previous };
    },
    onError: (error, newTitle, onMutateResult) => {
      queryClient.setQueryData(todosKey, onMutateResult?.previous);
      setRollback(`"${newTitle}" was rolled back: ${errorMessage(error)}`);
    },
    onSuccess: () => setTitle(''),
    // Success or failure, refetch so the cache matches the server.
    onSettled: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed) addTodo.mutate(trimmed);
  };

  return (
    <div className="stack">
      <form className="row" onSubmit={submit} aria-label="Add a todo">
        <TextField
          label="New todo"
          hint='Titles containing "fail" make the server return 500.'
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={addTodo.isPending}>
          {addTodo.isPending ? 'Saving…' : 'Add'}
        </Button>
      </form>
      <div className="row">
        <Button size="sm" onClick={() => void todos.refetch()} disabled={todos.isFetching}>
          Refetch
        </Button>
        <span className="small muted" role="status">
          {todos.isPending ? 'Loading…' : todos.isFetching ? 'Refreshing…' : 'Up to date'}
        </span>
      </div>
      {todos.isError ? (
        <Callout tone="danger" title="Could not load todos">
          {errorMessage(todos.error)}
        </Callout>
      ) : null}
      {rollback ? (
        <Callout tone="warn" title="Optimistic update rolled back">
          {rollback}
        </Callout>
      ) : null}
      <ul className="list" aria-label="Todos">
        {todos.data?.map((todo) => (
          <li key={todo.id} className="spread">
            <span>{todo.title}</span>
            {todo.id.startsWith(OPTIMISTIC_PREFIX) ? <Badge tone="info">saving…</Badge> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
