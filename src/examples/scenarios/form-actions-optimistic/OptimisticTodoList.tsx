import { startTransition, useActionState, useId, useOptimistic, useRef, useState } from 'react';
import { createTodo, errorMessage, type Todo } from './todosApi';
import { SubmitButton } from './SubmitButton';

interface ListedTodo extends Todo {
  /** Only on the optimistic placeholder while its request is in flight. */
  pending?: boolean;
}

interface AddTodoState {
  error: string | null;
  /** Text to put back into the field after a failure (the form resets after every action). */
  draft: string;
  lastAdded: string | null;
}

const INITIAL_STATE: AddTodoState = { error: null, draft: '', lastAdded: null };

/**
 * React 19 form Actions end to end: `<form action>` runs the action in a
 * transition, `useActionState` keeps its result (error, draft), `useFormStatus`
 * drives the submit button, and `useOptimistic` shows the new todo at once —
 * React drops it automatically when the action settles, so a failure rolls
 * back without any cleanup code.
 */
export function OptimisticTodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const inputId = useId();
  const errorId = useId();
  const [todos, setTodos] = useState(initialTodos);
  const [optimisticTodos, addOptimisticTodo] = useOptimistic<ListedTodo[], ListedTodo>(
    todos,
    (current, todo) => [...current, todo],
  );
  const nextOptimisticId = useRef(0);

  const [state, formAction, isPending] = useActionState<AddTodoState, FormData>(
    async (_previous, formData) => {
      const title = String(formData.get('title') ?? '').trim();
      if (!title) return { error: 'Enter a title for the todo.', draft: '', lastAdded: null };
      nextOptimisticId.current += 1;
      addOptimisticTodo({
        id: `optimistic-${nextOptimisticId.current}`,
        title,
        completed: false,
        pending: true,
      });
      try {
        const saved = await createTodo(title);
        // Updates after `await` need their own transition to stay part of
        // the action; otherwise the real item would render before the
        // optimistic one is dropped (a duplicate for one frame).
        startTransition(() => setTodos((current) => [...current, saved]));
        return { error: null, draft: '', lastAdded: saved.title };
      } catch (error) {
        return {
          error: `Could not add “${title}”: ${errorMessage(error)}`,
          draft: title,
          lastAdded: null,
        };
      }
    },
    INITIAL_STATE,
  );

  return (
    <div className="stack">
      <form action={formAction} className="stack">
        <div className="field">
          <label htmlFor={inputId} className="field-label">
            New todo
          </label>
          <div className="row">
            <input
              id={inputId}
              name="title"
              className="input form-actions-input"
              autoComplete="off"
              defaultValue={state.draft}
              aria-invalid={state.error ? true : undefined}
              aria-describedby={state.error ? errorId : undefined}
            />
            <SubmitButton />
          </div>
          {state.error ? (
            <p id={errorId} role="alert" className="field-error">
              {state.error}
            </p>
          ) : null}
        </div>
      </form>
      {state.lastAdded ? <p className="small muted">Saved “{state.lastAdded}”.</p> : null}
      <ul className="list" aria-label="Todos" aria-busy={isPending}>
        {optimisticTodos.map((todo) => (
          <li key={todo.id} className={todo.pending ? 'spread form-actions-pending' : 'spread'}>
            <span className={todo.pending ? 'muted' : undefined}>{todo.title}</span>
            {todo.pending ? <span className="badge badge-warn">Saving…</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
