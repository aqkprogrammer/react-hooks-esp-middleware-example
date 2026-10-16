import { useState, type FormEvent } from 'react';
import { Button, Callout, Panel, RenderCount, TextField } from '../../../components/ui';
import { useTodos, useTodosDispatch } from './todosContext';
import { TodosProvider } from './TodosProvider';

/**
 * `useReducer` in a provider, exposed through separate state and dispatch
 * contexts. The render counters show that the form (dispatch only) does not
 * re-render when the list changes, while state consumers do.
 */
export default function ContextReducerDemo() {
  return (
    <TodosProvider>
      <div className="stack">
        <div className="grid">
          <Panel title="Add a todo" description="Reads only the dispatch context.">
            <RenderCount label="AddTodo">
              <AddTodo />
            </RenderCount>
          </Panel>
          <Panel title="Summary" description="Reads the state context.">
            <RenderCount label="Summary">
              <Summary />
            </RenderCount>
          </Panel>
        </div>
        <Panel title="List" description="Reads both contexts.">
          <RenderCount label="TodoList">
            <TodoList />
          </RenderCount>
        </Panel>
        <Callout title="Why split the contexts?">
          Every consumer of a context re-renders when its value changes. A single{' '}
          <code>{'{ state, dispatch }'}</code> object would be new on every state change and
          re-render the form too. Context has no selectors: for many independent slices, use several
          contexts or an external store with <code>useSyncExternalStore</code>.
        </Callout>
      </div>
    </TodosProvider>
  );
}

function AddTodo() {
  const dispatch = useTodosDispatch();
  const [title, setTitle] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    dispatch({ type: 'added', title: trimmed });
    setTitle('');
  };
  return (
    <form className="row" onSubmit={submit} aria-label="Add a todo">
      <TextField
        label="New todo"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Button type="submit" variant="primary">
        Add
      </Button>
    </form>
  );
}

function Summary() {
  const { items } = useTodos();
  const done = items.filter((item) => item.done).length;
  return (
    <p className="small" role="status">
      {done} of {items.length} done
    </p>
  );
}

function TodoList() {
  const { items } = useTodos();
  const dispatch = useTodosDispatch();
  return (
    <div className="stack">
      <ul className="list" aria-label="Todos">
        {items.length === 0 ? <li className="muted">Nothing to do.</li> : null}
        {items.map((item) => (
          <li key={item.id} className="spread">
            <label className="row">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => dispatch({ type: 'toggled', id: item.id })}
              />
              {item.title}
            </label>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Delete ${item.title}`}
              onClick={() => dispatch({ type: 'removed', id: item.id })}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button onClick={() => dispatch({ type: 'clearedDone' })}>Clear completed</Button>
      </div>
    </div>
  );
}
