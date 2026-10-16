import { useState, useTransition } from 'react';
import { Badge, Button, Callout, Panel, TextField, ValueTable } from '../../../components/ui';
import { errorMessage, saveDisplayName } from './api';

/**
 * Since React 19, `startTransition` accepts an async function — an
 * "Action". `isPending` turns true immediately and stays true until the
 * whole async function settles, replacing a hand-written `isSaving` flag.
 */
export default function AsyncTransitionDemo() {
  const [savedName, setSavedName] = useState('Ada');
  const [draft, setDraft] = useState('Ada');
  const [error, setError] = useState<string | null>(null);
  const [saves, setSaves] = useState(0);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        const result = await saveDisplayName(draft);
        // Updates after `await` lose the transition context; wrap them again
        // so they commit together with the end of the pending state.
        startTransition(() => {
          setSavedName(result.name);
          setSaves((count) => count + 1);
          setError(null);
        });
      } catch (caught) {
        startTransition(() => setError(errorMessage(caught)));
      }
    });
  };

  return (
    <div className="stack">
      <Panel
        title="Rename (async transition)"
        description="Saving takes ~800 ms. Names containing “error” fail on the server."
      >
        <div className="row">
          <TextField
            label="Display name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            error={error ?? undefined}
          />
          <Button variant="primary" onClick={save} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <p role="status" className="small">
          {isPending ? (
            <Badge tone="warn">Action pending</Badge>
          ) : (
            <Badge tone="success">Idle</Badge>
          )}
        </p>
        <ValueTable rows={{ 'Saved name': savedName, 'Successful saves': saves }} />
      </Panel>
      <Callout title="What changed in React 19">
        In React 18 the transition callback had to be synchronous, so pending state for network
        calls needed extra <code>useState</code>. Errors thrown inside an Action and not caught go
        to the nearest error boundary — catch them where you can show a message.
      </Callout>
    </div>
  );
}
