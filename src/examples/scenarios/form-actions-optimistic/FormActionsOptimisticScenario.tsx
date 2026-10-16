import { Button, Callout, Panel } from '../../../components/ui';
import { useAsync } from '../../../hooks';
import { OptimisticTodoList } from './OptimisticTodoList';
import { errorMessage, fetchTodos } from './todosApi';
import './FormActionsOptimisticScenario.css';

/**
 * An optimistic todo list built only from React 19 primitives — form
 * Actions, `useActionState`, `useFormStatus` and `useOptimistic` — against
 * the mocked `/api/todos` (a title containing “fail” is rejected with 500).
 */
export default function FormActionsOptimisticScenario() {
  const todos = useAsync((signal) => fetchTodos(signal), []);

  return (
    <div className="stack">
      <Panel
        title="Todos"
        description="Add a todo: it appears instantly and is confirmed by the server a moment later. Put “fail” in the title to watch the optimistic item roll back."
      >
        {todos.status === 'pending' ? <p role="status">Loading todos…</p> : null}
        {todos.status === 'error' ? (
          <div className="stack">
            <p role="alert">Could not load todos: {errorMessage(todos.error)}</p>
            <div>
              <Button onClick={todos.reload}>Retry</Button>
            </div>
          </div>
        ) : null}
        {todos.status === 'success' ? <OptimisticTodoList initialTodos={todos.data} /> : null}
      </Panel>
      <Callout title="Who does what">
        <code>{'<form action={fn}>'}</code> calls <code>fn(formData)</code> inside a transition and
        resets the form when it finishes. <code>useActionState</code> stores what the action returns
        (here: the error and the text to restore). <code>useFormStatus</code> lets the submit button
        see that its form is pending. <code>useOptimistic</code> shows a value only while the action
        runs — success replaces it with real state, failure simply drops it.
      </Callout>
    </div>
  );
}
