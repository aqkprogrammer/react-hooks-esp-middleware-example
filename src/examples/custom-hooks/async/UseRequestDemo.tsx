import { useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  EventLog,
  Panel,
  ValueTable,
  useEventLog,
} from '../../../components/ui';
import { createRequestCache, fetchJson, useRequest } from '../../../hooks';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const KEY = '/api/todos';
// One cache for this demo page (an app would have one for the whole app).
const cache = createRequestCache();
const getTodos = (url: string) => fetchJson<Todo[]>(url);

export default function UseRequestDemo() {
  const [readers, setReaders] = useState(2);
  const [failNext, setFailNext] = useState(false);
  const { entries, log, clear } = useEventLog();
  const todos = useRequest(KEY, getTodos, { cache, staleTimeMs: 5000 });

  const toggle = async (todo: Todo) => {
    const completed = !todo.completed;
    // 1. Optimistic: every reader updates immediately.
    await todos.mutate(
      (list = []) => list.map((t) => (t.id === todo.id ? { ...t, completed } : t)),
      { revalidate: false },
    );
    log(`Optimistically set "${todo.title}" → ${completed ? 'done' : 'open'}`);
    try {
      await fetchJson(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(failNext ? { 'x-fail': '1' } : {}) },
        body: JSON.stringify({ completed }),
      });
      log('Server confirmed', 'success');
    } catch (error) {
      log(`Server rejected (${(error as Error).message}) — revalidating rolls back`, 'error');
    } finally {
      // 2. Re-sync with the server either way.
      await todos.revalidate();
    }
  };

  return (
    <div className="stack">
      <Panel title="Shared cache">
        <ValueTable
          label="Cache status"
          rows={{
            'Network requests for /api/todos': cache.fetchCount(KEY),
            'Mounted readers': readers + 1,
            isValidating: String(todos.isValidating),
          }}
        />
        <div className="row">
          <Button onClick={() => setReaders((n) => n + 1)}>Mount another reader</Button>
          <Button onClick={() => setReaders((n) => Math.max(0, n - 1))} disabled={readers === 0}>
            Unmount a reader
          </Button>
          <Button onClick={() => void todos.revalidate()}>Revalidate now</Button>
        </div>
        <p className="muted small">
          Readers mounted within 5 s of the last fetch reuse the cache (no request). After that they
          render the cached list instantly <em>and</em> revalidate in the background.
        </p>
      </Panel>
      <Panel title="Todos (editable)">
        <label className="row">
          <input
            type="checkbox"
            checked={failNext}
            onChange={(e) => setFailNext(e.target.checked)}
          />
          Make the server reject updates
        </label>
        {todos.isLoading ? <p className="muted">Loading…</p> : null}
        {todos.error ? (
          <Callout tone="danger" title="Could not load">
            {todos.error.message}
          </Callout>
        ) : null}
        <ul className="list" aria-label="Todos">
          {(todos.data ?? []).map((todo) => (
            <li key={todo.id}>
              <label className="row">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => void toggle(todo)}
                />
                {todo.title}
              </label>
            </li>
          ))}
        </ul>
        <EventLog entries={entries} onClear={clear} />
      </Panel>
      <div className="grid">
        {Array.from({ length: readers }, (_, index) => (
          <Reader key={index} index={index + 1} />
        ))}
      </div>
    </div>
  );
}

function Reader({ index }: { index: number }) {
  const { data, isLoading, isValidating } = useRequest(KEY, getTodos, { cache, staleTimeMs: 5000 });
  const done = data?.filter((todo) => todo.completed).length ?? 0;
  return (
    <div className="card">
      <div className="spread">
        <strong>Reader {index}</strong>
        {isValidating ? <Badge tone="info">revalidating</Badge> : null}
      </div>
      <p>{isLoading ? 'Loading…' : `${done} of ${data?.length ?? 0} done`}</p>
    </div>
  );
}
