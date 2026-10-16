import { useId, useState } from 'react';
import { Badge, EventLog, Panel, TextField, useEventLog } from '../../../components/ui';
import { useFocus, useFocusWithin } from '../../../hooks';

/** `useFocus` for a single input, `useFocusWithin` for a group of fields. */
export default function UseFocusDemo() {
  return (
    <div className="stack">
      <SearchField />
      <AddressGroup />
    </div>
  );
}

function SearchField() {
  const [ref, isFocused] = useFocus<HTMLInputElement>();
  const hintId = useId();
  return (
    <Panel title="useFocus" description="A hint that only appears while the input is focused.">
      <div className="field">
        <label htmlFor={`${hintId}-input`} className="field-label">
          Search docs
        </label>
        <input
          id={`${hintId}-input`}
          ref={ref}
          className="input"
          type="search"
          aria-describedby={isFocused ? hintId : undefined}
        />
        {isFocused ? (
          <p id={hintId} className="field-hint">
            Tip: type at least two characters, then press <kbd className="kbd">Enter</kbd>.
          </p>
        ) : null}
      </div>
      <p>
        Input focused: <Badge tone={isFocused ? 'success' : 'neutral'}>{String(isFocused)}</Badge>
      </p>
    </Panel>
  );
}

function AddressGroup() {
  const { entries, log, clear } = useEventLog(20);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [touched, setTouched] = useState(false);
  const [ref, isFocusWithin] = useFocusWithin<HTMLFieldSetElement>({
    onFocusWithin: () => log('Focus entered the address group'),
    onBlurWithin: (event) => {
      const next =
        event.relatedTarget instanceof HTMLElement ? describeElement(event.relatedTarget) : null;
      log(`Focus left the group → ${next ?? 'nothing (relatedTarget: null)'}`, 'warn');
      setTouched(true);
    },
  });
  const statusId = useId();
  const incomplete = touched && !isFocusWithin && (street.trim() === '' || city.trim() === '');

  return (
    <Panel
      title="useFocusWithin"
      description="Tab between the two fields: moving inside the group does not count as leaving it. Validation runs only when focus leaves the whole group."
    >
      <fieldset ref={ref} className="card stack" aria-describedby={statusId}>
        <legend>
          Shipping address{' '}
          <Badge tone={isFocusWithin ? 'success' : 'neutral'}>
            {isFocusWithin ? 'focus within' : 'not focused'}
          </Badge>
        </legend>
        <TextField label="Street" value={street} onChange={(e) => setStreet(e.target.value)} />
        <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </fieldset>
      <p id={statusId} role="status" className={incomplete ? 'field-error' : 'muted small'}>
        {incomplete ? 'Please complete both address fields.' : 'Validation runs when you leave.'}
      </p>
      <button type="button" className="btn btn-secondary">
        Next step (a focus target outside the group)
      </button>
      <EventLog entries={entries} onClear={clear} />
    </Panel>
  );
}

function describeElement(element: HTMLElement): string {
  const label = element.getAttribute('aria-label') ?? element.textContent?.trim();
  return `<${element.tagName.toLowerCase()}>${label ? ` “${label.slice(0, 40)}”` : ''}`;
}
