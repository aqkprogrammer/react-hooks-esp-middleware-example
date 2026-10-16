import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Callout, Panel, TextField, ValueTable, show } from '../../../components/ui';
import { errorMessage, saveDisplayName } from './api';

/**
 * `useFormStatus` (from react-dom) reads the status of the *parent* `<form>`
 * whose `action` is running — like a context the form provides — so a
 * reusable submit button needs no props to know it should be disabled.
 */
export default function UseFormStatusDemo() {
  const [savedName, setSavedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Called in the component that *renders* the form: it is not inside the
  // form, so it never sees the form's pending state.
  const ownerStatus = useFormStatus();

  async function saveAction(formData: FormData) {
    setError(null);
    try {
      const result = await saveDisplayName(String(formData.get('displayName') ?? ''));
      setSavedName(result.name);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <div className="stack">
      <Panel
        title="Profile settings"
        description="Saving takes ~800 ms. A name containing “error” makes the server fail."
      >
        <form action={saveAction} className="stack">
          <TextField label="Display name" name="displayName" defaultValue="Ada" required />
          <div className="row">
            <SubmitButton />
          </div>
          <FormStatusReadout />
        </form>
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
        {savedName ? <p role="status">Saved display name: {savedName}</p> : null}
      </Panel>
      <Callout tone="warn" title="Only works inside the form">
        The form&apos;s owner also calls <code>useFormStatus()</code> and always gets{' '}
        <code>pending: {String(ownerStatus.pending)}</code>: the hook reads the closest parent{' '}
        <code>&lt;form&gt;</code>, not a form rendered by the same component.
      </Callout>
    </div>
  );
}

/** A reusable submit button: it learns everything from the enclosing form. */
function SubmitButton() {
  const { pending, data } = useFormStatus();
  const name = data?.get('displayName');
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? `Saving “${typeof name === 'string' ? name : ''}”…` : 'Save'}
    </Button>
  );
}

function FormStatusReadout() {
  const status = useFormStatus();
  return (
    <ValueTable
      label="useFormStatus() inside the form"
      rows={{
        pending: String(status.pending),
        method: show(status.method),
        'data.get("displayName")': show(status.data?.get('displayName') ?? null),
      }}
    />
  );
}
