import { useRef, useState } from 'react';
import { Button, Callout, Panel, TextField, ValueTable, show } from '../../../components/ui';

interface Task {
  id: number;
  title: string;
  done: boolean;
}

const initialTasks: Task[] = [
  { id: 1, title: 'Read the useState docs', done: true },
  { id: 2, title: 'Write a reducer', done: false },
  { id: 3, title: 'Ship it', done: false },
];

interface Settings {
  profile: { name: string; address: { city: string; country: string } };
  notifications: { email: boolean; push: boolean };
}

const initialSettings: Settings = {
  profile: { name: 'Ada', address: { city: 'London', country: 'UK' } },
  notifications: { email: true, push: false },
};

/** Immutable updates for arrays and nested objects, plus the mutation bug. */
export default function UseStateImmutableUpdatesDemo() {
  return (
    <div className="stack">
      <Panel title="Arrays: add, toggle, remove, reorder, sort">
        <TaskList />
      </Panel>
      <Panel title="Nested objects: copy every level you change">
        <NestedSettings />
      </Panel>
      <Panel
        title="The mutation bug"
        description="Mutating the array keeps the same reference, so React bails out of the update."
      >
        <MutationBug />
      </Panel>
    </div>
  );
}

function TaskList() {
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState('');
  const nextId = useRef(initialTasks.length + 1);

  const add = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id = nextId.current++;
    setTasks((previous) => [...previous, { id, title: trimmed, done: false }]);
    setTitle('');
  };
  const toggle = (id: number) =>
    setTasks((previous) =>
      previous.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  const remove = (id: number) => setTasks((previous) => previous.filter((task) => task.id !== id));
  const moveUp = (index: number) =>
    setTasks((previous) => {
      if (index <= 0) return previous;
      const copy = [...previous];
      const [moved] = copy.splice(index, 1);
      if (moved) copy.splice(index - 1, 0, moved);
      return copy;
    });
  const sortByTitle = () =>
    setTasks((previous) => previous.toSorted((a, b) => a.title.localeCompare(b.title)));

  return (
    <div className="stack">
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <TextField
          label="New task"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button type="submit" variant="primary">
          Add
        </Button>
        <Button onClick={sortByTitle}>Sort A–Z (toSorted)</Button>
      </form>
      <ul className="list" aria-label="Tasks">
        {tasks.map((task, index) => (
          <li key={task.id} className="spread">
            <label className="row">
              <input type="checkbox" checked={task.done} onChange={() => toggle(task.id)} />
              <span>{task.title}</span>
            </label>
            <span className="row">
              <Button
                size="sm"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                aria-label={`Move "${task.title}" up`}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => remove(task.id)}
                aria-label={`Delete "${task.title}"`}
              >
                Delete
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NestedSettings() {
  const [settings, setSettings] = useState(initialSettings);
  return (
    <div className="stack">
      <TextField
        label="City"
        value={settings.profile.address.city}
        onChange={(event) => {
          const city = event.target.value;
          // settings → profile → address → city: copy each level on the path.
          setSettings((previous) => ({
            ...previous,
            profile: {
              ...previous.profile,
              address: { ...previous.profile.address, city },
            },
          }));
        }}
      />
      <label className="row">
        <input
          type="checkbox"
          checked={settings.notifications.email}
          onChange={(event) => {
            const email = event.target.checked;
            setSettings((previous) => ({
              ...previous,
              notifications: { ...previous.notifications, email },
            }));
          }}
        />
        Email notifications
      </label>
      <ValueTable label="Settings state" rows={{ settings: show(settings) }} />
      <p className="muted small">
        Unchanged branches keep their identity, so memoised children that receive them can skip
        rendering. Deep, frequently edited trees are easier with <code>useReducer</code> or Immer.
      </p>
    </div>
  );
}

function MutationBug() {
  const [items, setItems] = useState<string[]>(['first']);
  const [, forceRender] = useState(0);
  return (
    <div className="stack">
      <div className="row">
        <Button
          variant="danger"
          onClick={() => {
            items.push(`pushed #${items.length + 1}`); // deliberate bug: mutates state in place
            setItems(items); // same reference → Object.is says "no change" → no render
          }}
        >
          items.push() then setItems(items)
        </Button>
        <Button
          variant="primary"
          onClick={() => setItems((previous) => [...previous, `added #${previous.length + 1}`])}
        >
          setItems([...items, item])
        </Button>
        <Button onClick={() => forceRender((n) => n + 1)}>Re-render for another reason</Button>
      </div>
      <ul className="list" aria-label="Items">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Callout tone="warn" title="Why it fails">
        React compares the old and new state with <code>Object.is</code>. A mutated array is the
        same object, so the push only shows up when something else happens to re-render — and
        memoised children may never show it.
      </Callout>
    </div>
  );
}
