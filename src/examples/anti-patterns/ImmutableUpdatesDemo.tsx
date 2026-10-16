import { memo, useState } from 'react';
import { Button, Callout, Panel, RenderCount, TextField } from '../../components/ui';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const initialTodos: readonly Todo[] = [
  { id: 1, title: 'Write tests', done: false },
  { id: 2, title: 'Review PR', done: true },
];

/**
 * Corrected version of broken/MutatingState.tsx. Every update creates new
 * arrays/objects (spread, map, filter, toSorted), so React sees a new
 * reference, memoised children update correctly, and keeping old versions
 * for undo is free.
 */
export default function ImmutableUpdatesDemo() {
  const [todos, setTodos] = useState<readonly Todo[]>(initialTodos);
  const [history, setHistory] = useState<ReadonlyArray<readonly Todo[]>>([]);
  const [title, setTitle] = useState('');
  const [sortByTitle, setSortByTitle] = useState(false);

  const update = (next: readonly Todo[]) => {
    setHistory((previous) => [...previous, todos]);
    setTodos(next);
  };

  // ✅ Sorting a copy during render — the state array is never reordered.
  const visible = sortByTitle ? todos.toSorted((a, b) => a.title.localeCompare(b.title)) : todos;

  return (
    <div className="stack">
      <Panel
        title="Todos"
        description="Every change keeps the previous array intact, which is what makes Undo trivial."
      >
        <form
          className="row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            const nextId = Math.max(0, ...todos.map((todo) => todo.id)) + 1;
            update([...todos, { id: nextId, title: title.trim(), done: false }]);
            setTitle('');
          }}
        >
          <TextField
            label="New todo"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
        <div className="row">
          <label className="row small">
            <input
              type="checkbox"
              checked={sortByTitle}
              onChange={(event) => setSortByTitle(event.target.checked)}
            />
            Sort by title (a sorted copy)
          </label>
          <Button
            disabled={history.length === 0}
            onClick={() => {
              const previous = history.at(-1);
              if (!previous) return;
              setHistory((entries) => entries.slice(0, -1));
              setTodos(previous);
            }}
          >
            Undo ({history.length})
          </Button>
        </div>
        <TodoList
          todos={visible}
          onToggle={(id) =>
            update(todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)))
          }
          onRemove={(id) => update(todos.filter((todo) => todo.id !== id))}
        />
      </Panel>
      <Callout title="Copying helpers">
        Arrays: <code>[...a, x]</code>, <code>map</code>, <code>filter</code>, <code>toSorted</code>
        , <code>toSpliced</code>, <code>with</code>. Objects:{' '}
        <code>{'{ ...obj, key: value }'}</code>. For deep updates, Immer&apos;s <code>produce</code>{' '}
        lets you write mutations against a draft safely.
      </Callout>
    </div>
  );
}

const TodoList = memo(function TodoList({
  todos,
  onToggle,
  onRemove,
}: {
  todos: readonly Todo[];
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <RenderCount label="TodoList">
      <ul className="list" aria-label="Todos">
        {todos.map((todo) => (
          <li key={todo.id} className="spread">
            <label className="row">
              <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
              {todo.title}
            </label>
            <Button size="sm" variant="ghost" onClick={() => onRemove(todo.id)}>
              Remove {todo.title}
            </Button>
          </li>
        ))}
      </ul>
    </RenderCount>
  );
});
