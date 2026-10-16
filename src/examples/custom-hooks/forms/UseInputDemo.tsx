import { useId } from 'react';
import { Button, Callout, Panel, TextField, ValueTable, show } from '../../../components/ui';
import { useInput } from '../../../hooks';

const digitsOnly = (raw: string) => raw.replace(/\D/g, '').slice(0, 12);

/**
 * Three controlled inputs, each a single `useInput` call: a plain text field,
 * a transformed (digits-only) field and a `<select>`, all bound with `{...bind}`.
 */
export default function UseInputDemo() {
  const name = useInput('');
  const phone = useInput('', { transform: digitsOnly });
  const plan = useInput('free');
  const planId = useId();

  const resetAll = () => {
    name.reset();
    phone.reset();
    plan.reset();
  };

  return (
    <div className="stack">
      <Panel
        title="Controlled inputs"
        description="Each field is one useInput call spread with {...bind}."
      >
        <TextField label="Name" autoComplete="name" {...name.bind} />
        <TextField
          label="Phone"
          inputMode="numeric"
          autoComplete="tel"
          hint="The transform strips anything that is not a digit (max 12)."
          {...phone.bind}
        />
        <div className="field">
          <label htmlFor={planId} className="field-label">
            Plan
          </label>
          <select id={planId} {...plan.bind}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="team">Team</option>
          </select>
        </div>
        <div className="row">
          <Button onClick={() => name.setValue('Ada Lovelace')}>Fill name (setValue)</Button>
          <Button variant="ghost" onClick={resetAll}>
            Reset all
          </Button>
        </div>
      </Panel>
      <Panel title="Current values">
        <ValueTable
          label="Current values"
          rows={{ name: show(name.value), phone: show(phone.value), plan: show(plan.value) }}
        />
        <p className="muted small" aria-live="polite">
          {name.value ? `Hello, ${name.value}!` : 'Type a name to be greeted.'}
        </p>
      </Panel>
      <Callout title="Do you need state at all?">
        If you only read the values on submit, an uncontrolled form read with{' '}
        <code>new FormData(event.currentTarget)</code> needs no hook. Use <code>useInput</code> when
        the UI reacts to every keystroke (previews, formatting, character counts).
      </Callout>
    </div>
  );
}
