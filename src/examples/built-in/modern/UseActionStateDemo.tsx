import { useActionState } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { errorMessage, subscribeToNewsletter } from './api';

type SubscribeState =
  | { status: 'idle'; attempts: number }
  | { status: 'success'; attempts: number; message: string }
  | { status: 'error'; attempts: number; message: string; email: string };

const initialState: SubscribeState = { status: 'idle', attempts: 0 };

/**
 * The action receives the *previous* state and the submitted FormData and
 * returns the next state — a reducer that may be async. `useActionState`
 * returns that state, a `formAction` to pass to `<form action>`, and
 * `isPending` while it runs.
 */
async function subscribeAction(
  previous: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get('email') ?? '');
  const attempts = previous.attempts + 1;
  try {
    const result = await subscribeToNewsletter(email);
    return { status: 'success', attempts, message: result.message };
  } catch (error) {
    // Returning the error as state (instead of throwing) keeps the form on
    // screen; a thrown error would go to the nearest error boundary.
    return { status: 'error', attempts, message: errorMessage(error), email };
  }
}

export default function UseActionStateDemo() {
  const [state, formAction, isPending] = useActionState(subscribeAction, initialState);

  return (
    <div className="stack">
      <Panel
        title="Newsletter sign-up"
        description="Try a valid address, an invalid one, or one containing “taken” (already subscribed)."
      >
        <form action={formAction} className="stack" aria-busy={isPending}>
          <TextField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            // After an action React resets the form; keep a rejected address so it can be fixed.
            defaultValue={state.status === 'error' ? state.email : ''}
            error={state.status === 'error' ? state.message : undefined}
            disabled={isPending}
          />
          <div className="row">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Subscribing…' : 'Subscribe'}
            </Button>
            <span role="status" className="small">
              {isPending ? <Badge tone="warn">Pending</Badge> : null}
              {!isPending && state.status === 'success' ? (
                <Badge tone="success">{state.message}</Badge>
              ) : null}
            </span>
          </div>
        </form>
        <p className="small muted">Submissions so far: {state.attempts}</p>
      </Panel>
      <Callout title="No useState, no onSubmit, no preventDefault">
        Passing a function to <code>action</code> makes React call it in a transition with the
        form&apos;s <code>FormData</code>. Here the action runs in the browser; with a Server
        Function and the <code>permalink</code> argument the same form can also submit before
        JavaScript has loaded.
      </Callout>
    </div>
  );
}
