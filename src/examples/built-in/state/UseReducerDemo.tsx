import { useReducer, useState } from 'react';
import { Button, Callout, EventLog, Panel, TextField, useEventLog } from '../../../components/ui';
import {
  createInitialState,
  selectVisibleTasks,
  tasksReducer,
  type TaskFilter,
  type TasksAction,
} from './tasksReducer';

const seedTitles = ['Model the state', 'List the actions', 'Write the reducer'] as const;
const filters: readonly TaskFilter[] = ['all', 'active', 'done'];

/**
 * useReducer with a typed discriminated-union action, an exhaustive `never`
 * check, lazy initialisation and single-level undo.
 */
export default function UseReducerDemo() {
  // Third argument = initialiser: `createInitialState(seedTitles)` runs once.
  const [state, dispatch] = useReducer(tasksReducer, seedTitles, createInitialState);
  const [title, setTitle] = useState('');
  const { entries, log, clear } = useEventLog(20);

  const send = (action: TasksAction) => {
    log(`dispatch(${JSON.stringify(action)})`);
    dispatch(action);
  };

  const visible = selectVisibleTasks(state);
  const remaining = state.tasks.filter((task) => !task.done).length;

  return (
    <div className="stack">
      <Panel
        title="Task board"
        description="Every interaction dispatches an action; the reducer decides the next state."
      >
        <form
          className="row"
          onSubmit={(event) => {
            event.preventDefault();
            send({ type: 'added', title });
            setTitle('');
          }}
        >
          <TextField
            label="Task title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button type="submit" variant="primary">
            Add task
          </Button>
        </form>

        <div className="row" role="group" aria-label="Filter">
          {filters.map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={state.filter === filter ? 'primary' : 'secondary'}
              aria-pressed={state.filter === filter}
              onClick={() => send({ type: 'filterChanged', filter })}
            >
              {filter}
            </Button>
          ))}
        </div>

        <ul className="list" aria-label="Tasks">
          {visible.length === 0 ? <li className="muted">No tasks</li> : null}
          {visible.map((task) => (
            <li key={task.id} className="spread">
              <label className="row">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => send({ type: 'toggled', id: task.id })}
                />
                <span>{task.title}</span>
              </label>
              <Button
                size="sm"
                variant="danger"
                aria-label={`Delete "${task.title}"`}
                onClick={() => send({ type: 'deleted', id: task.id })}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>

        <div className="spread">
          <span className="small muted" aria-live="polite">
            {remaining} of {state.tasks.length} remaining
          </span>
          <div className="row">
            <Button onClick={() => send({ type: 'clearedCompleted' })}>Clear completed</Button>
            <Button onClick={() => send({ type: 'undone' })} disabled={!state.previous}>
              Undo
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Dispatched actions">
        <EventLog entries={entries} onClear={clear} title="Actions" />
      </Panel>

      <Callout title="Reducer or state?">
        Pick <code>useReducer</code> when several values change together, when the next state
        depends on the previous one in non-trivial ways, or when you want the update logic in a pure
        function you can unit-test. For an independent toggle or input, <code>useState</code> is
        simpler.
      </Callout>
    </div>
  );
}
