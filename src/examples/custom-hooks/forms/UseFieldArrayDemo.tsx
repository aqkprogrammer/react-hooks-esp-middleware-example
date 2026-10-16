import { useEffect, useId, useRef, useState } from 'react';
import { Button, Callout, Panel, ValueTable, show } from '../../../components/ui';
import { useFieldArray } from '../../../hooks';
import './UseFieldArrayDemo.css';

interface Phone {
  kind: 'mobile' | 'home' | 'work';
  number: string;
}

const isValidNumber = (number: string) => number.replace(/\D/g, '').length >= 7;

/** A list of phone numbers with add/remove/reorder and stable row keys. */
export default function UseFieldArrayDemo() {
  const phones = useFieldArray<Phone>([
    { kind: 'mobile', number: '+44 7700 900123' },
    { kind: 'work', number: '' },
  ]);
  const [useIndexKeys, setUseIndexKeys] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [status, setStatus] = useState('');
  const baseId = useId();
  const addRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  // Where focus goes after a structural change (the focused button may be gone).
  const pendingFocus = useRef<{ key: string; control: 'number' | 'up' | 'down' } | 'add' | null>(
    null,
  );

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === 'add') addRef.current?.focus();
    else if (target) {
      const row = rowRefs.current.get(target.key);
      const find = (control: string) =>
        row?.querySelector<HTMLInputElement | HTMLButtonElement>(`[data-control="${control}"]`);
      // A row moved to an edge disables its Up/Down button: use the other one.
      const fallback =
        target.control === 'up' ? 'down' : target.control === 'down' ? 'up' : 'number';
      const element = find(target.control);
      (element && !element.disabled ? element : find(fallback))?.focus();
    }
  }, [phones.fields]);

  const remove = (index: number) => {
    const neighbour = phones.fields[index + 1] ?? phones.fields[index - 1];
    pendingFocus.current = neighbour ? { key: neighbour.key, control: 'number' } : 'add';
    phones.remove(index);
    setStatus(`Phone ${index + 1} removed.`);
  };

  const move = (index: number, to: number, control: 'up' | 'down') => {
    const field = phones.fields[index];
    if (!field) return;
    pendingFocus.current = { key: field.key, control };
    phones.move(index, to);
    setStatus(`Phone moved to position ${to + 1}.`);
  };

  return (
    <div className="stack">
      <Panel
        title="Phone numbers"
        description="Type a note in a row, then remove or reorder rows above it."
      >
        <ol className="field-array-demo-list">
          {phones.fields.map((field, index) => {
            const rowId = `${baseId}-${field.key}`;
            const showError = touched.has(field.key) && !isValidNumber(field.value.number);
            const errorId = `${rowId}-error`;
            return (
              <li
                key={useIndexKeys ? index : field.key}
                ref={(element) => {
                  if (!element) return;
                  rowRefs.current.set(field.key, element);
                  return () => {
                    rowRefs.current.delete(field.key);
                  };
                }}
                className="field-array-demo-row card"
              >
                <fieldset className="field-array-demo-fieldset">
                  <legend className="field-label">Phone {index + 1}</legend>
                  <div className="row">
                    <div className="field">
                      <label htmlFor={`${rowId}-kind`} className="small">
                        Type
                      </label>
                      <select
                        id={`${rowId}-kind`}
                        value={field.value.kind}
                        onChange={(event) =>
                          phones.update(index, (previous) => ({
                            ...previous,
                            kind: event.target.value as Phone['kind'],
                          }))
                        }
                      >
                        <option value="mobile">Mobile</option>
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`${rowId}-number`} className="small">
                        Number
                      </label>
                      <input
                        id={`${rowId}-number`}
                        data-control="number"
                        className="input"
                        type="tel"
                        value={field.value.number}
                        aria-invalid={showError || undefined}
                        aria-describedby={showError ? errorId : undefined}
                        onBlur={() => setTouched((previous) => new Set(previous).add(field.key))}
                        onChange={(event) =>
                          phones.update(index, (previous) => ({
                            ...previous,
                            number: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`${rowId}-note`} className="small">
                        Note (uncontrolled)
                      </label>
                      <input id={`${rowId}-note`} className="input" defaultValue="" />
                    </div>
                  </div>
                  {showError ? (
                    <p id={errorId} className="field-error">
                      Enter at least 7 digits.
                    </p>
                  ) : null}
                  <div className="row">
                    <Button
                      size="sm"
                      data-control="up"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1, 'up')}
                      aria-label={`Move phone ${index + 1} up`}
                    >
                      ↑ Up
                    </Button>
                    <Button
                      size="sm"
                      data-control="down"
                      disabled={index === phones.fields.length - 1}
                      onClick={() => move(index, index + 1, 'down')}
                      aria-label={`Move phone ${index + 1} down`}
                    >
                      ↓ Down
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => remove(index)}
                      aria-label={`Remove phone ${index + 1}`}
                    >
                      Remove
                    </Button>
                    <span className="muted small mono">
                      key: {useIndexKeys ? index : field.key}
                    </span>
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>
        {phones.fields.length === 0 ? <p className="muted">No phone numbers yet.</p> : null}
        <div className="row">
          <button
            ref={addRef}
            type="button"
            className="btn btn-primary"
            onClick={() => {
              phones.append({ kind: 'mobile', number: '' });
              setStatus(`Phone ${phones.fields.length + 1} added.`);
            }}
          >
            Add phone
          </button>
          <Button variant="ghost" onClick={phones.reset}>
            Reset list
          </Button>
        </div>
        <p role="status" className="small muted">
          {status}
        </p>
      </Panel>
      <Panel title="Keys">
        <label className="row">
          <input
            type="checkbox"
            checked={useIndexKeys}
            onChange={(event) => setUseIndexKeys(event.target.checked)}
          />
          Use the array index as <code>key</code> (broken on purpose)
        </label>
        <Callout tone={useIndexKeys ? 'warn' : 'info'}>
          {useIndexKeys
            ? 'Index keys: remove the first row and its uncontrolled note jumps to the next phone.'
            : 'Stable keys: each row keeps its own note, focus and DOM node through moves and removals.'}
        </Callout>
        <ValueTable label="Submitted value" rows={{ values: show(phones.values) }} />
      </Panel>
    </div>
  );
}
