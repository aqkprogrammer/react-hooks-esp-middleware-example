import { useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { HttpError, TimeoutError, useFetch } from '../../../hooks';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

/** Per-user latency: Ada is slow, so clicking Ada then Grace makes Ada's response arrive last. */
const USERS = [
  { id: 1, label: 'Ada (slow, 1.5 s)', delay: 1500 },
  { id: 2, label: 'Grace (fast)', delay: 100 },
  { id: 3, label: 'Alan (medium)', delay: 600 },
  { id: 999, label: 'Missing user (404)', delay: 100 },
] as const;

export default function UseFetchDemo() {
  const [userId, setUserId] = useState<number | null>(1);
  const [withTimeout, setWithTimeout] = useState(false);
  const selected = USERS.find((user) => user.id === userId);
  const url = selected ? `/api/users/${selected.id}?delay=${selected.delay}` : null;
  const user = useFetch<User>(url, withTimeout ? { timeoutMs: 1000 } : {});

  return (
    <div className="stack">
      <Panel
        title="Pick a user"
        description="Click quickly between users: the card only ever shows the user you picked last."
      >
        <div className="row" role="group" aria-label="Users">
          {USERS.map((option) => (
            <Button
              key={option.id}
              variant={option.id === userId ? 'primary' : 'secondary'}
              aria-pressed={option.id === userId}
              onClick={() => setUserId(option.id)}
            >
              {option.label}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setUserId(null)}>
            None (url = null)
          </Button>
        </div>
        <label className="row">
          <input
            type="checkbox"
            checked={withTimeout}
            onChange={(event) => setWithTimeout(event.target.checked)}
          />
          1 s timeout (Ada will time out)
        </label>
      </Panel>
      <Panel title="Result">
        <p aria-live="polite">
          Status: <Badge tone={user.status === 'error' ? 'warn' : 'info'}>{user.status}</Badge>
        </p>
        {user.status === 'pending' ? <p className="muted">Loading user {userId}…</p> : null}
        {user.status === 'success' ? (
          <ValueTable
            label="User"
            rows={{ name: user.data.name, email: user.data.email, role: user.data.role }}
          />
        ) : null}
        {user.status === 'error' ? (
          <Callout tone="danger" title={describe(user.error)}>
            {user.error.message}{' '}
            <Button size="sm" onClick={user.reload}>
              Retry
            </Button>
          </Callout>
        ) : null}
        {user.status === 'idle' ? <p className="muted">No user selected.</p> : null}
      </Panel>
    </div>
  );
}

function describe(error: Error): string {
  if (error instanceof HttpError) return `HTTP ${error.status}`;
  if (error instanceof TimeoutError) return 'Timed out';
  if (error instanceof TypeError) return 'Network error';
  return 'Error';
}
