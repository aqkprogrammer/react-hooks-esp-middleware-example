import { useId, useState } from 'react';
import { Button } from '../../../components/ui';
import { useInterval } from '../../../hooks';

/** Local state that must survive switching tabs. */
export function NotesPanel() {
  const [text, setText] = useState('');
  const id = useId();
  return (
    <div className="stack">
      <label htmlFor={id} className="field-label">
        Meeting notes
      </label>
      <textarea
        id={id}
        className="input"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <p className="muted small">{text.length} characters — switch tabs and come back.</p>
    </div>
  );
}

/**
 * Effects stop while the panel is hidden by `<Activity>` (state is kept), so
 * this timer only counts while you are looking at it.
 */
export function TimerPanel() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useInterval(() => setSeconds((value) => value + 1), running ? 1000 : null);
  return (
    <div className="stack">
      <p className="tabs-timer">
        Time on this tab: <strong className="mono">{seconds}s</strong>
      </p>
      <div className="row">
        <Button onClick={() => setRunning((value) => !value)} aria-pressed={running}>
          {running ? 'Pause timer' : 'Start timer'}
        </Button>
        <Button onClick={() => setSeconds(0)}>Reset</Button>
      </div>
      <p className="muted small">
        Hidden panels keep their state but their effects are disconnected, so the interval stops
        while another tab is shown.
      </p>
    </div>
  );
}

const TASKS = ['Write the agenda', 'Book a room', 'Send the invite'] as const;

export function ChecklistPanel() {
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  return (
    <fieldset className="tabs-checklist">
      <legend>Preparation</legend>
      {TASKS.map((task) => (
        <label key={task} className="row">
          <input
            type="checkbox"
            checked={done.has(task)}
            onChange={(event) => {
              const next = new Set(done);
              if (event.target.checked) next.add(task);
              else next.delete(task);
              setDone(next);
            }}
          />
          {task}
        </label>
      ))}
      <p className="muted small">
        {done.size} of {TASKS.length} done
      </p>
    </fieldset>
  );
}
