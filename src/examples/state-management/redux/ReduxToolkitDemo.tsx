import { useEffect, useState, type FormEvent } from 'react';
import { Provider } from 'react-redux';
import { Button, Callout, EventLog, Panel, TextField, useEventLog } from '../../../components/ui';
import { useAppDispatch, useAppSelector } from './hooks';
import { dismissed, selectNotifications } from './notificationsSlice';
import { makeStore, selectVisibleTodos } from './store';
import {
  addTodo,
  fetchTodos,
  filterChanged,
  selectFilter,
  selectIsAdding,
  selectItems,
  selectTodosError,
  selectTodosStatus,
  todoToggled,
  type Filter,
} from './todosSlice';

const filters: Filter[] = ['all', 'active', 'done'];

/**
 * Redux Toolkit with typed React Redux hooks, async thunks against the mocked
 * API, a custom audit middleware and the listener middleware.
 */
export default function ReduxToolkitDemo() {
  const { entries, log, clear } = useEventLog(25);
  // A store per mounted demo — not a global app store.
  const [store] = useState(() => makeStore({ audit: (line) => log(line) }));
  return (
    <Provider store={store}>
      <div className="grid">
        <Panel title="Todos" description="createSlice + createAsyncThunk + typed hooks">
          <TodoApp />
        </Panel>
        <div className="stack">
          <Panel title="Notifications" description="Dispatched by the listener middleware.">
            <Notifications />
          </Panel>
          <EventLog title="Audit log (custom middleware)" entries={entries} onClear={clear} />
        </div>
      </div>
    </Provider>
  );
}

function TodoApp() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectTodosStatus);
  const error = useAppSelector(selectTodosError);
  const adding = useAppSelector(selectIsAdding);
  const filter = useAppSelector(selectFilter);
  const total = useAppSelector(selectItems).length;
  const visible = useAppSelector(selectVisibleTodos);
  const [title, setTitle] = useState('');

  useEffect(() => {
    void dispatch(fetchTodos());
  }, [dispatch]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    // Dispatching a thunk returns its promise; `.match` narrows the result.
    const result = await dispatch(addTodo(trimmed));
    if (addTodo.fulfilled.match(result)) setTitle('');
  };

  return (
    <div className="stack">
      <form className="row" onSubmit={submit} aria-label="Add a todo">
        <TextField
          label="New todo"
          hint='Titles containing "fail" are rejected by the mock server.'
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={adding}>
          {adding ? 'Adding…' : 'Add'}
        </Button>
      </form>
      <div className="row" role="group" aria-label="Filter">
        {filters.map((option) => (
          <Button
            key={option}
            size="sm"
            aria-pressed={filter === option}
            variant={filter === option ? 'primary' : 'secondary'}
            onClick={() => dispatch(filterChanged(option))}
          >
            {option}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => void dispatch(fetchTodos())}>
          Reload
        </Button>
      </div>
      {status === 'loading' ? <p role="status">Loading todos…</p> : null}
      {error ? (
        <Callout tone="danger" title="Could not load todos">
          {error}
        </Callout>
      ) : null}
      <ul className="list" aria-label="Todos">
        {status === 'succeeded' && visible.length === 0 ? (
          <li className="muted">No {filter === 'all' ? '' : `${filter} `}todos.</li>
        ) : null}
        {visible.map((todo) => (
          <li key={todo.id}>
            <label className="row">
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => dispatch(todoToggled(todo.id))}
              />
              {todo.title}
            </label>
          </li>
        ))}
      </ul>
      <p className="small muted">
        Showing {visible.length} of {total}. Toggling is client-only state.
      </p>
    </div>
  );
}

function Notifications() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  return (
    <ul className="list" aria-label="Notifications" aria-live="polite">
      {notifications.length === 0 ? <li className="muted">No notifications.</li> : null}
      {notifications.map((notification) => (
        <li key={notification.id} className="spread">
          <span className={notification.tone === 'danger' ? 'field-error' : undefined}>
            {notification.tone === 'danger' ? 'Error: ' : 'Success: '}
            {notification.text}
          </span>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Dismiss: ${notification.text}`}
            onClick={() => dispatch(dismissed(notification.id))}
          >
            Dismiss
          </Button>
        </li>
      ))}
    </ul>
  );
}
