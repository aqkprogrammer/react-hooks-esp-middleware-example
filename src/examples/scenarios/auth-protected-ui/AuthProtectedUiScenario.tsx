import { useEffect, useId, useRef } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { useAsyncFn } from '../../../hooks';
import { EXPIRE_URL } from './authApi';
import { useAuth } from './authContext';
import { AuthProvider } from './AuthProvider';
import { NotesSection } from './NotesSection';
import { RequireAuth } from './Protected';
import { SignInForm } from './SignInForm';
import './AuthProtectedUiScenario.css';

function SignInPrompt({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="stack auth-prompt">
      <p>Team notes are only available to signed-in members.</p>
      <div>
        <Button onClick={onSignIn}>Sign in to view notes</Button>
      </div>
    </div>
  );
}

function AuthWorkspace() {
  const { session, notice, signOut, authFetch } = useAuth();
  const signInTitleId = useId();
  const accountTitleId = useId();
  const signInHeading = useRef<HTMLHeadingElement>(null);
  const accountHeading = useRef<HTMLHeadingElement>(null);
  const expire = useAsyncFn((signal: AbortSignal) =>
    authFetch<void>(EXPIRE_URL, { method: 'POST', signal }),
  );

  // The form or the account panel disappears on every auth change: move
  // focus to the heading of what replaced it so keyboard users are not lost.
  const signedIn = session !== null;
  const previous = useRef(signedIn);
  useEffect(() => {
    if (previous.current === signedIn) return;
    previous.current = signedIn;
    (signedIn ? accountHeading : signInHeading).current?.focus();
  }, [signedIn]);

  const focusSignIn = () => {
    const form = signInHeading.current?.closest('section');
    form?.querySelector<HTMLInputElement>('input')?.focus();
  };

  return (
    <div className="grid auth-grid">
      {session ? (
        <section className="panel" aria-labelledby={accountTitleId}>
          <h3 id={accountTitleId} ref={accountHeading} tabIndex={-1} className="panel-title">
            Signed in as {session.user.name}
          </h3>
          <div className="panel-body">
            <p className="row">
              Role:{' '}
              <Badge tone={session.user.role === 'editor' ? 'success' : 'info'}>
                {session.user.role}
              </Badge>
            </p>
            <p className="muted small">
              The role came from <code>GET /api/me</code>, sent with{' '}
              <code>Authorization: Bearer …</code>. The token lives in memory only.
            </p>
            <div className="row">
              <Button onClick={signOut}>Sign out</Button>
              <Button
                variant="ghost"
                onClick={() => void expire.execute()}
                disabled={expire.status === 'pending'}
              >
                Expire session on the server
              </Button>
            </div>
            {expire.status === 'success' ? (
              <p role="status" className="small">
                The server revoked your token. The next request (try “Refresh notes”) answers 401
                and signs you out.
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="panel" aria-labelledby={signInTitleId}>
          <h3 id={signInTitleId} ref={signInHeading} tabIndex={-1} className="panel-title">
            Sign in
          </h3>
          <div className="panel-body">
            {notice ? (
              <div className="callout callout-warn">
                <strong className="callout-title">Signed out</strong>
                <div>{notice}</div>
              </div>
            ) : null}
            <SignInForm />
          </div>
        </section>
      )}

      <Panel title="Team notes (protected)">
        <RequireAuth fallback={<SignInPrompt onSignIn={focusSignIn} />}>
          <NotesSection />
        </RequireAuth>
      </Panel>
    </div>
  );
}

/**
 * Authentication UI: sign in with `POST /api/login`, keep the token in
 * memory, load the user (and role) from `GET /api/me`, gate sections by
 * authentication and role, and handle server-side session expiry.
 */
export default function AuthProtectedUiScenario() {
  return (
    <div className="stack">
      <AuthProvider>
        <AuthWorkspace />
      </AuthProvider>
      <Callout tone="warn" title="Hiding UI is not security">
        <code>RequireAuth</code> and <code>RequireRole</code> only decide what to <em>render</em>.
        Anyone can call the API directly, so the server must authenticate and authorise every
        request — sign in as <strong>viewer</strong> and press “Try to add a note anyway” to see the
        403.
      </Callout>
      <Callout title="Why the token is not in localStorage">
        Anything in localStorage or sessionStorage can be read by any script on the page, so one XSS
        bug leaks every token. Keeping it in memory limits the damage, at the cost of signing out on
        reload. Production apps let the server set an <strong>HttpOnly, Secure, SameSite</strong>{' '}
        refresh cookie that JavaScript cannot read, and fetch a short-lived access token into memory
        on load. “Remember me” is then a server decision: a longer-lived refresh cookie — not a
        token persisted by the client.
      </Callout>
    </div>
  );
}
