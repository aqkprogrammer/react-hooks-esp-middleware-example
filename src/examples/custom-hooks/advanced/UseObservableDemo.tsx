import { useMemo, useState } from 'react';
import {
  BehaviorSubject,
  Subject,
  debounceTime,
  distinctUntilChanged,
  interval,
  map,
  scan,
} from 'rxjs';
import { Badge, Button, Panel, TextField, ValueTable } from '../../../components/ui';
import { useObservable } from '../../../hooks/advanced';

/** Shared state as a BehaviorSubject: it always has a current value. */
const counter$ = new BehaviorSubject(0);

function CounterPanel() {
  const { value } = useObservable(counter$, counter$.getValue());
  return (
    <Panel
      title="BehaviorSubject"
      description="Shared state with a current value — no flash of the placeholder."
    >
      <div className="row">
        <Button onClick={() => counter$.next(counter$.getValue() - 1)}>−1</Button>
        <strong aria-label="Counter value">{value}</strong>
        <Button onClick={() => counter$.next(counter$.getValue() + 1)}>+1</Button>
      </div>
    </Panel>
  );
}

function DebouncedSearch() {
  const [text, setText] = useState('');
  // Create the subject and the derived stream once; re-creating them in
  // render would re-subscribe on every keystroke.
  const input$ = useMemo(() => new Subject<string>(), []);
  const debounced$ = useMemo(
    () =>
      input$.pipe(
        debounceTime(400),
        map((value) => value.trim()),
        distinctUntilChanged(),
      ),
    [input$],
  );
  const { value, status } = useObservable(debounced$, '');
  return (
    <Panel
      title="Operators"
      description="Typing pushes into a Subject; the hook renders the debounced stream."
    >
      <TextField
        label="Search"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          input$.next(event.target.value);
        }}
      />
      <ValueTable
        label="Debounced value"
        rows={{ 'Debounced (400 ms)': value || '—', Status: status }}
      />
    </Panel>
  );
}

function Ticker() {
  const [running, setRunning] = useState(false);
  const [failing, setFailing] = useState(false);
  const ticks$ = useMemo(
    () =>
      running
        ? interval(500).pipe(
            scan((count) => count + 1, 0),
            map((count) => {
              if (failing && count >= 3) throw new Error(`Tick ${count} failed`);
              return count;
            }),
          )
        : null,
    [running, failing],
  );
  const { value, status, error } = useObservable(ticks$, 0);
  return (
    <Panel
      title="Switching sources & errors"
      description="Stopping passes null (unsubscribe); the error toggle makes the stream throw at tick 3."
    >
      <div className="row">
        <Button
          variant="primary"
          onClick={() => setRunning((value) => !value)}
          aria-pressed={running}
        >
          {running ? 'Stop ticker' : 'Start ticker'}
        </Button>
        <label className="row">
          <input
            type="checkbox"
            checked={failing}
            onChange={(event) => setFailing(event.target.checked)}
          />
          Fail at tick 3
        </label>
      </div>
      <ValueTable
        label="Ticker"
        rows={{
          Tick: value,
          Status: <Badge tone={status === 'error' ? 'warn' : 'neutral'}>{status}</Badge>,
          Error: error ? error.message : '—',
        }}
      />
    </Panel>
  );
}

export default function UseObservableDemo() {
  return (
    <div className="stack">
      <CounterPanel />
      <DebouncedSearch />
      <Ticker />
    </div>
  );
}
