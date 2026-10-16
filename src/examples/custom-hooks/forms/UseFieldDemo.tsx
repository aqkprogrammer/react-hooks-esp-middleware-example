import { useState } from 'react';
import { Badge, Button, Panel, ValueTable, show } from '../../../components/ui';
import { useField, type ValidateOn } from '../../../hooks';
import { emailFormat, required } from './formsApi';

const MODES: Array<{ value: ValidateOn; label: string; description: string }> = [
  {
    value: 'touched',
    label: 'touched (default)',
    description: 'first on blur, then on every change',
  },
  { value: 'blur', label: 'blur', description: 'only when the field loses focus' },
  { value: 'change', label: 'change', description: 'on every keystroke' },
];

/** Compare validation timings on the same email field. */
export default function UseFieldDemo() {
  const [mode, setMode] = useState<ValidateOn>('touched');
  return (
    <div className="stack">
      <Panel title="When should errors appear?">
        <fieldset className="stack">
          <legend className="field-label">Validate on</legend>
          {MODES.map((option) => (
            <label key={option.value} className="row">
              <input
                type="radio"
                name="validate-on"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
              />
              <span>
                <span className="mono">{option.label}</span>{' '}
                <span className="muted small">— {option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </Panel>
      {/* Remount on mode change so every mode starts untouched. */}
      <EmailField key={mode} mode={mode} />
    </div>
  );
}

function EmailField({ mode }: { mode: ValidateOn }) {
  const email = useField({
    validate: [required('Email'), emailFormat],
    validateOn: mode,
  });
  return (
    <Panel title="Validated field" description="Type an invalid address, tab away, then fix it.">
      <div className="field">
        <label htmlFor={email.inputProps.id} className="field-label">
          Email
        </label>
        <input className="input" type="email" autoComplete="email" {...email.inputProps} />
        {email.error ? (
          <p id={email.errorId} className="field-error">
            {email.error}
          </p>
        ) : null}
      </div>
      <div className="row">
        <Button onClick={() => void email.validate()}>Validate now</Button>
        <Button variant="ghost" onClick={email.reset}>
          Reset
        </Button>
        {email.touched && !email.error ? <Badge tone="success">Looks good</Badge> : null}
      </div>
      <ValueTable
        label="Field state"
        rows={{
          value: show(email.value),
          touched: String(email.touched),
          dirty: String(email.dirty),
          error: show(email.error),
          'aria-invalid': show(email.inputProps['aria-invalid']),
        }}
      />
    </Panel>
  );
}
