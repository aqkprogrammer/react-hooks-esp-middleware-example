import { useId, useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui';
import { HttpError, useAsync, useAsyncFn } from '../../../hooks';
import { NOTES_URL, type Note } from './authApi';
import { useAuth } from './authContext';
import { RequireRole } from './Protected';

const errorText = (error: unknown) =>
  error instanceof HttpError
    ? error.message
    : error instanceof Error
      ? error.message
      : String(error);

/** Protected data: only rendered for signed-in users, fetched with the bearer token. */
export function NotesSection() {
  const { authFetch, session } = useAuth();
  const token = session?.token;
  const notes = useAsync((signal) => authFetch<Note[]>(NOTES_URL, { signal }), [token], {
    keepPreviousData: true,
  });
  const textId = useId();
  const [text, setText] = useState('');

  const create = useAsyncFn(async (signal: AbortSignal, body: string) =>
    authFetch<Note>(NOTES_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: body }),
      signal,
    }),
  );

  const list = notes.data ?? [];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    const outcome = await create.execute(body);
    if (outcome.status === 'success') {
      setText('');
      notes.reload(); // show what the server now has
    }
  };

  return (
    <div className="stack">
      <div className="spread">
        <h4 className="auth-subtitle">Team notes</h4>
        <Button size="sm" onClick={notes.reload} disabled={notes.status === 'pending'}>
          {notes.status === 'pending' ? 'Loading…' : 'Refresh notes'}
        </Button>
      </div>
      {notes.status === 'error' ? (
        <p role="alert" className="field-error">
          Could not load notes: {errorText(notes.error)}
        </p>
      ) : null}
      <ul className="list" aria-label="Team notes" aria-busy={notes.status === 'pending'}>
        {list.map((note) => (
          <li key={note.id}>
            {note.text} <span className="muted small">— {note.author}</span>
          </li>
        ))}
        {list.length === 0 && notes.status !== 'pending' ? (
          <li className="muted">No notes yet.</li>
        ) : null}
      </ul>

      <RequireRole
        requires="editor"
        fallback={
          <div className="stack">
            <p className="muted">
              You have read-only access, so the editor is hidden. Hiding it is a courtesy, not a
              safeguard — the server checks the role on every request:
            </p>
            <div>
              <Button onClick={() => void create.execute('Sneaky note')}>
                Try to add a note anyway
              </Button>
            </div>
          </div>
        }
      >
        <form className="row auth-note-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor={textId} className="visually-hidden">
            New note
          </label>
          <input
            id={textId}
            className="input"
            value={text}
            placeholder="New note"
            onChange={(event) => setText(event.target.value)}
          />
          <Button type="submit" variant="primary" disabled={create.status === 'pending'}>
            Add note
          </Button>
        </form>
      </RequireRole>
      {create.status === 'error' ? (
        <p role="alert" className="field-error">
          The server refused: {errorText(create.error)}
        </p>
      ) : null}
    </div>
  );
}
