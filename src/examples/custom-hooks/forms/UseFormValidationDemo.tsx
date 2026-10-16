import { useId, useState } from 'react';
import { Badge, EventLog, Panel, ValueTable, show, useEventLog } from '../../../components/ui';
import { useFormValidation } from '../../../hooks';
import { checkUsernameAvailable, usernameFormat } from './formsApi';

interface Values {
  username: string;
}

/**
 * The mock endpoint answers *shorter* names more slowly, so typing quickly
 * makes old responses arrive after newer ones. useFormValidation aborts the
 * superseded check and ignores its result.
 */
export default function UseFormValidationDemo() {
  const [username, setUsername] = useState('');
  const [debounce, setDebounce] = useState(false);
  const { entries, log, clear } = useEventLog();
  const inputId = useId();
  const messageId = `${inputId}-message`;

  const validation = useFormValidation<Values>({
    username: {
      validate: usernameFormat,
      asyncDebounceMs: debounce ? 300 : 0,
      validateAsync: async (value, _values, signal) => {
        log(`request "${value}"`);
        signal.addEventListener('abort', () => log(`aborted "${value}" (superseded)`, 'warn'));
        const message = await checkUsernameAvailable(value, signal);
        log(
          `response "${value}": ${message ? 'taken' : 'available'}`,
          message ? 'error' : 'success',
        );
        return message;
      },
    },
  });

  const error = validation.errors.username;
  const checking = validation.validating.username === true;
  const status = !username
    ? 'Try “ada”, “admin”, or a new name.'
    : checking
      ? 'Checking availability…'
      : (error ?? `“${username}” is available`);

  return (
    <div className="stack">
      <Panel title="Username availability (sync + async rules)">
        <div className="field">
          <label htmlFor={inputId} className="field-label">
            Username
          </label>
          <input
            id={inputId}
            className="input"
            autoComplete="username"
            value={username}
            aria-invalid={error ? true : undefined}
            aria-describedby={messageId}
            onChange={(event) => {
              const next = event.target.value;
              setUsername(next);
              void validation.validateField('username', { username: next });
            }}
          />
          <p id={messageId} className={error ? 'field-error' : 'field-hint'} role="status">
            {status}
          </p>
        </div>
        <label className="row">
          <input
            type="checkbox"
            checked={debounce}
            onChange={(event) => setDebounce(event.target.checked)}
          />
          Debounce the async check by 300 ms (fewer requests)
        </label>
        <div className="row">
          {checking ? <Badge tone="info">validating</Badge> : null}
          {!checking && username && !error ? <Badge tone="success">available</Badge> : null}
          {error ? <Badge tone="warn">invalid</Badge> : null}
        </div>
        <ValueTable
          label="Validation state"
          rows={{ errors: show(validation.errors), validating: show(validation.validating) }}
        />
      </Panel>
      <EventLog entries={entries} onClear={clear} title="Network log" />
    </div>
  );
}
