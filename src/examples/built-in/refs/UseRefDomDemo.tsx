import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button, Callout, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';

/** useRef for DOM access (focus management), previous values and timer ids. */
export default function UseRefDomDemo() {
  return (
    <div className="stack">
      <Panel
        title="Focus management"
        description="On submit, focus moves to the first invalid field."
      >
        <SignUpForm />
      </Panel>
      <Panel title="Previous value">
        <PreviousValueDemo />
      </Panel>
      <Panel
        title="Storing an interval id"
        description="The id is not rendered, so it lives in a ref."
      >
        <AutoSaver />
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SignUpForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [submitted, setSubmitted] = useState<string | null>(null);
  const id = useId();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameRef.current?.value.trim() ?? '';
    const email = emailRef.current?.value.trim() ?? '';
    const next = {
      name: name ? undefined : 'Name is required',
      email: /^\S+@\S+\.\S+$/.test(email) ? undefined : 'Enter a valid email address',
    };
    setErrors(next);
    // Imperative DOM work belongs in event handlers (or effects), never in render.
    if (next.name) nameRef.current?.focus();
    else if (next.email) emailRef.current?.focus();
    else setSubmitted(`Signed up ${name} <${email}>`);
  };

  return (
    <form className="stack" onSubmit={onSubmit} noValidate>
      <div className="grid">
        <div className="field">
          <label className="field-label" htmlFor={`${id}-name`}>
            Name
          </label>
          <input
            ref={nameRef}
            id={`${id}-name`}
            className="input"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
          />
          {errors.name ? (
            <p id={`${id}-name-error`} className="field-error">
              {errors.name}
            </p>
          ) : null}
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-email`}>
            Email
          </label>
          <input
            ref={emailRef}
            id={`${id}-email`}
            type="email"
            className="input"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${id}-email-error` : undefined}
          />
          {errors.email ? (
            <p id={`${id}-email-error`} className="field-error">
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>
      <div className="row">
        <Button type="submit" variant="primary">
          Sign up
        </Button>
        <Button onClick={() => emailRef.current?.focus()}>Focus the email field</Button>
      </div>
      {submitted ? <p role="status">{submitted}</p> : null}
    </form>
  );
}

// ---------------------------------------------------------------------------

function PreviousValueDemo() {
  const [count, setCount] = useState(0);
  const { entries, log, clear } = useEventLog(10);
  return (
    <div className="stack">
      <div className="row">
        <Button onClick={() => setCount((c) => c + 1)}>+1</Button>
        <Button onClick={() => setCount((c) => c + 10)}>+10</Button>
      </div>
      <PreviousValue value={count} log={log} />
      <EventLog entries={entries} onClear={clear} title="Changes" />
    </div>
  );
}

function PreviousValue({ value, log }: { value: number; log: (message: string) => void }) {
  // Ref version: remembers the value from the last commit. Read it only in
  // effects/handlers — reading `ref.current` during render is not allowed.
  const previousRef = useRef(value);
  useEffect(() => {
    if (previousRef.current !== value) {
      log(`changed from ${previousRef.current} to ${value}`);
      previousRef.current = value;
    }
  }, [value, log]);

  // Render-safe version for *displaying* the previous value: state adjusted
  // during render when the prop changes (the documented pattern).
  const [tracked, setTracked] = useState({ value, previous: null as number | null });
  if (tracked.value !== value) {
    setTracked({ value, previous: tracked.value });
  }

  return (
    <ValueTable
      label="Current and previous value"
      rows={{ current: value, previous: tracked.previous ?? '—' }}
    />
  );
}

// ---------------------------------------------------------------------------

function AutoSaver() {
  const intervalRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [saves, setSaves] = useState(0);

  const start = () => {
    if (intervalRef.current !== null) return; // already running
    intervalRef.current = window.setInterval(() => setSaves((n) => n + 1), 1000);
    setRunning(true);
  };
  const stop = () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  };

  // Clear the interval if the component unmounts while running.
  useEffect(() => {
    const ref = intervalRef;
    return () => {
      if (ref.current !== null) window.clearInterval(ref.current);
    };
  }, []);

  return (
    <div className="stack">
      <ValueTable
        label="Auto-saver"
        rows={{ status: running ? 'saving every second' : 'stopped', saves }}
      />
      <div className="row">
        <Button variant="primary" onClick={start} disabled={running}>
          Start auto-save
        </Button>
        <Button onClick={stop} disabled={!running}>
          Stop auto-save
        </Button>
      </div>
      <Callout title="Why not state?">
        The id is only needed by <code>stop()</code>. Keeping it in state would re-render for
        nothing, and a local variable would be lost on the next render.
      </Callout>
    </div>
  );
}
