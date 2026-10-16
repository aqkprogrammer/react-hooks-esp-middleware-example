/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Anti-pattern: mutating state in place. React compares state by reference
 * (Object.is): `setTodos(todos)` after a push is ignored, and memoised
 * children keep showing old data. `react-hooks/immutability` reports the
 * direct assignment to a state object (`filters.showDone = …` below) but not
 * array methods such as `push`/`sort` or writes to objects reached through
 * `.map`/`.find`, so reviews and tests still matter.
 * Corrected version: ../ImmutableUpdatesDemo.tsx
 */
import { useState } from 'react';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

export function TodoList({ initial }: { initial: Todo[] }) {
  const [todos, setTodos] = useState(initial);
  const [filters, setFilters] = useState({ showDone: true });

  function add(title: string) {
    // ❌ Mutates the current state array; same reference → React bails out, no re-render.
    todos.push({ id: todos.length + 1, title, done: false });
    setTodos(todos);
  }

  // ❌ Sorting in place mutates state *during render*.
  todos.sort((a, b) => a.title.localeCompare(b.title));

  return (
    <ul>
      <li>
        <button
          onClick={() => {
            // ❌ Mutates the state object itself (flagged by react-hooks/immutability).
            filters.showDone = !filters.showDone;
            setFilters(filters);
          }}
        >
          {filters.showDone ? 'Hide done' : 'Show done'}
        </button>
      </li>
      {todos.map((todo) => (
        <li key={todo.id}>
          <button
            onClick={() => {
              // ❌ Mutates an object the previous render still uses (not detected by lint).
              todo.done = !todo.done;
              setTodos([...todos]);
            }}
          >
            {todo.done ? '✓' : '○'} {todo.title}
          </button>
        </li>
      ))}
      <li>
        <button onClick={() => add('New')}>Add</button>
      </li>
    </ul>
  );
}
