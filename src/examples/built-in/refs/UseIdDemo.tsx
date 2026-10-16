import { useId, useState } from 'react';
import { Button, Callout, Panel } from '../../../components/ui';

/**
 * A reusable field that must work when rendered many times on one page:
 * every id it needs is derived from one `useId()` call.
 */
function PasswordField({ label }: { label: string }) {
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [value, setValue] = useState('');
  const tooShort = value.length > 0 && value.length < 8;

  return (
    <div className="field">
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="password"
        className="input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={tooShort || undefined}
        aria-describedby={tooShort ? `${hintId} ${errorId}` : hintId}
        autoComplete="new-password"
      />
      <p id={hintId} className="field-hint">
        At least 8 characters.
      </p>
      {tooShort ? (
        <p id={errorId} className="field-error">
          {8 - value.length} more character{8 - value.length === 1 ? '' : 's'} needed.
        </p>
      ) : null}
      <p className="small muted">
        Generated ids: <code>{inputId}</code>, <code>{hintId}</code>
      </p>
    </div>
  );
}

/** useId for accessible labels and descriptions in reusable components. */
export default function UseIdDemo() {
  const [extra, setExtra] = useState(0);
  return (
    <div className="stack">
      <Panel
        title="Multiple instances, unique ids"
        description="Each field links its label, hint and error."
      >
        <form className="stack" onSubmit={(event) => event.preventDefault()}>
          <PasswordField label="New password" />
          <PasswordField label="Confirm password" />
          {Array.from({ length: extra }, (_, index) => (
            <PasswordField key={index} label={`Extra password ${index + 1}`} />
          ))}
        </form>
        <div className="row">
          <Button onClick={() => setExtra((count) => count + 1)}>Add another field</Button>
          <Button
            onClick={() => setExtra((count) => Math.max(0, count - 1))}
            disabled={extra === 0}
          >
            Remove the last extra field
          </Button>
        </div>
      </Panel>
      <Callout tone="warn" title="Not for list keys">
        <code>useId</code> returns one id per component <em>call site</em>, not per data item, and
        it cannot be called in a loop. Keys must come from your data (<code>item.id</code>).
        Generate ids for <em>data</em> when you create it (e.g. <code>crypto.randomUUID()</code> in
        the handler that adds the item).
      </Callout>
      <Callout title="Why not a counter or Math.random()?">
        <code>useId</code> derives the id from the component&apos;s position in the tree, so the
        server and the client produce the same value and hydration matches. Treat the format as
        opaque: React 19.1 changed it from <code>:r0:</code> to <code>«r0»</code> and React 19.2 to{' '}
        <code>_r_0_</code>, which is valid in CSS selectors. Use <code>identifierPrefix</code> on{' '}
        <code>createRoot</code>/<code>hydrateRoot</code> when several React apps share a page.
      </Callout>
    </div>
  );
}
