import { useId, useState } from 'react';
import {
  Button,
  Callout,
  EventLog,
  Panel,
  TextField,
  ValueTable,
  show,
  useEventLog,
} from '../../../components/ui';
import { useCookie, type CookieOptions } from '../../../hooks';

const COOKIE = 'playground_locale';
type SameSite = NonNullable<CookieOptions['sameSite']>;

/** Set and remove a real cookie with explicit attributes, and watch `document.cookie`. */
export default function UseCookieDemo() {
  const { entries, log, clear } = useEventLog();
  const [locale, setLocale, removeLocale] = useCookie(COOKIE, {
    onError: (error) => log(`${error.kind}: ${error.error.message}`, 'error'),
  });
  const [draft, setDraft] = useState('en-GB');
  const [maxAge, setMaxAge] = useState('3600');
  const [sameSite, setSameSite] = useState<SameSite>('lax');
  const [snapshot, setSnapshot] = useState(() => document.cookie);
  const sameSiteId = useId();

  const refreshSnapshot = () => setSnapshot(document.cookie);

  return (
    <div className="stack">
      <Panel title="Write the cookie" description={`Cookie name: ${COOKIE}`}>
        <div className="grid">
          <TextField label="Value" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <TextField
            label="Max-Age (seconds)"
            type="number"
            min={0}
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            hint="Empty = session cookie (deleted when the browser closes)."
          />
          <div className="field">
            <label className="field-label" htmlFor={sameSiteId}>
              SameSite
            </label>
            <select
              id={sameSiteId}
              className="input"
              value={sameSite}
              onChange={(e) => setSameSite(e.target.value as SameSite)}
            >
              <option value="lax">Lax (default)</option>
              <option value="strict">Strict</option>
              <option value="none">None (forces Secure)</option>
            </select>
          </div>
        </div>
        <div className="row">
          <Button
            variant="primary"
            onClick={() => {
              const ok = setLocale(draft, {
                sameSite,
                ...(maxAge === '' ? {} : { maxAge: Number(maxAge) }),
              });
              if (ok) log(`Set ${COOKIE}=${draft} (SameSite=${sameSite})`, 'success');
              refreshSnapshot();
            }}
          >
            Set cookie
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              removeLocale();
              log(`Removed ${COOKIE}`);
              refreshSnapshot();
            }}
          >
            Remove cookie
          </Button>
          <Button
            onClick={() => {
              const ok = setLocale('x'.repeat(5000));
              if (!ok) log('A 5 000-character value was rejected by the browser', 'warn');
              refreshSnapshot();
            }}
          >
            Try a 5 KB value
          </Button>
        </div>
      </Panel>
      <Panel title="Current state">
        <ValueTable
          label="Cookie values"
          rows={{
            'useCookie value': show(locale),
            'document.cookie': <span className="mono small">{snapshot || '(empty)'}</span>,
          }}
        />
        <Button size="sm" onClick={refreshSnapshot}>
          Refresh document.cookie
        </Button>
        <EventLog entries={entries} onClear={clear} />
      </Panel>
      <Callout tone="warn" title="Auth cookies must be HttpOnly">
        JavaScript only sees cookies without the <code>HttpOnly</code> flag — and so does any
        injected script. Session and auth cookies must be set by the server with{' '}
        <code>HttpOnly; Secure; SameSite</code>. Use this hook for preferences such as locale, theme
        or consent.
      </Callout>
    </div>
  );
}
