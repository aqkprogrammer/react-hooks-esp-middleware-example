import { useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Callout,
  EventLog,
  Panel,
  TextField,
  useEventLog,
} from '../../../components/ui';
import { fetchJson, HttpError, useAsyncFn } from '../../../hooks';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const createTodo = (signal: AbortSignal, title: string, slow: boolean) =>
  fetchJson<Todo>(`/api/todos${slow ? '?delay=2500' : ''}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title }),
    signal,
  });

/** An imperative mutation: nothing runs until the form is submitted. */
export default function UseAsyncFnDemo() {
  const [title, setTitle] = useState('Write the docs');
  const [slow, setSlow] = useState(false);
  const [created, setCreated] = useState<Todo[]>([]);
  const { entries, log, clear } = useEventLog();
  const save = useAsyncFn(createTodo);
  const pending = save.status === 'pending';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    log(`POST "${title}"`);
    const outcome = await save.execute(title, slow);
    if (outcome.status === 'success') {
      setCreated((list) => [...list, outcome.data]);
      setTitle('');
      log(`Created ${outcome.data.id}`, 'success');
    } else if (outcome.status === 'error') {
      log(outcome.error.message, 'error');
    } else {
      log('Superseded or cancelled — result ignored', 'warn');
    }
  };

  return (
    <div className="stack">
      <Panel title="Add a todo" description='Titles containing "fail" make the server answer 500.'>
        <form className="stack" onSubmit={onSubmit}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="row">
            <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
            Slow server (2.5 s) — gives you time to cancel
          </label>
          <div className="row">
            <Button type="submit" variant="primary" disabled={pending || title.trim() === ''}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            <Button onClick={save.cancel} disabled={!pending}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={save.reset}>
              Reset state
            </Button>
          </div>
        </form>
        <p aria-live="polite">
          Status: <Badge tone={save.status === 'error' ? 'warn' : 'info'}>{save.status}</Badge>
        </p>
        {save.status === 'error' ? (
          <Callout tone="danger" title="Save failed">
            {save.error.message}
            {save.error instanceof HttpError ? ` (status ${save.error.status})` : null}
          </Callout>
        ) : null}
      </Panel>
      <Panel title="Created this session">
        {created.length === 0 ? (
          <p className="muted">Nothing yet.</p>
        ) : (
          <ul className="list">
            {created.map((todo) => (
              <li key={todo.id}>
                <span className="mono small">{todo.id}</span> {todo.title}
              </li>
            ))}
          </ul>
        )}
        <EventLog entries={entries} onClear={clear} />
      </Panel>
      <Callout tone="warn" title="Cancelling is client-side">
        Aborting stops the browser from waiting. A POST that already reached the server may still be
        applied — make mutations idempotent (e.g. an idempotency key).
      </Callout>
    </div>
  );
}
