import { useState, type FormEvent } from 'react';
import { Button, Panel, TextField, ValueTable } from '../../../components/ui';
import { useList } from '../../../hooks';

interface Task {
  id: number;
  text: string;
  done: boolean;
}

const INITIAL: Task[] = [
  { id: 1, text: 'Write the hook', done: true },
  { id: 2, text: 'Write the tests', done: false },
  { id: 3, text: 'Write the docs', done: false },
];

let nextId = INITIAL.length + 1;

export default function UseListDemo() {
  const [tasks, actions] = useList<Task>(INITIAL);
  const [draft, setDraft] = useState('');

  const add = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    actions.push({ id: nextId++, text, done: false });
    setDraft('');
  };

  return (
    <div className="stack">
      <Panel title="Tasks" description="Every action returns a new array; no-ops keep the old one.">
        <form className="row" onSubmit={add}>
          <TextField label="New task" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" variant="primary">
            Add (push)
          </Button>
          <Button
            onClick={() => {
              const text = draft.trim() || 'Urgent task';
              actions.insertAt(0, { id: nextId++, text, done: false });
              setDraft('');
            }}
          >
            Insert at top
          </Button>
        </form>
        <ul className="list" aria-label="Tasks">
          {tasks.length === 0 ? <li className="muted">No tasks.</li> : null}
          {tasks.map((task, index) => (
            <li key={task.id} className="spread">
              <label className="row">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() =>
                    actions.updateAt(index, (item) => ({ ...item, done: !item.done }))
                  }
                />
                <span style={{ textDecoration: task.done ? 'line-through' : undefined }}>
                  {task.text}
                </span>
              </label>
              <span className="row">
                <Button
                  size="sm"
                  aria-label={`Move "${task.text}" up`}
                  disabled={index === 0}
                  onClick={() => actions.move(index, index - 1)}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  aria-label={`Move "${task.text}" down`}
                  disabled={index === tasks.length - 1}
                  onClick={() => actions.move(index, index + 1)}
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  aria-label={`Remove "${task.text}"`}
                  onClick={() => actions.removeAt(index)}
                >
                  ✕
                </Button>
              </span>
            </li>
          ))}
        </ul>
        <div className="row">
          <Button onClick={() => actions.filter((task) => !task.done)}>Remove done (filter)</Button>
          <Button onClick={actions.clear}>Clear</Button>
          <Button variant="ghost" onClick={actions.reset}>
            Reset
          </Button>
        </div>
        <ValueTable
          label="List summary"
          rows={{
            length: tasks.length,
            done: tasks.filter((task) => task.done).length,
          }}
        />
      </Panel>
    </div>
  );
}
