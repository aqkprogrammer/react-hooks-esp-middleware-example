import { useFormStatus } from 'react-dom';

/**
 * `useFormStatus` reads the status of the *parent* `<form>` — so it must be
 * called from a component rendered inside that form, not from the component
 * that renders the `<form>` itself.
 */
export function SubmitButton() {
  const status = useFormStatus();
  const title = status.pending ? String(status.data.get('title') ?? '').trim() : '';
  return (
    <>
      <button type="submit" className="btn btn-primary" disabled={status.pending}>
        {status.pending ? 'Adding…' : 'Add todo'}
      </button>
      <span role="status" className="small muted form-actions-status">
        {status.pending && title ? `Saving “${title}”…` : ''}
      </span>
    </>
  );
}
