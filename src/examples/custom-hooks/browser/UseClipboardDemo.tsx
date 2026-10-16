import { useId, useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { useClipboard } from '../../../hooks';

const SNIPPET = 'npm create vite@latest my-app -- --template react-ts';

export default function UseClipboardDemo() {
  const { copy, read, copied, error, reset, isSupported, isReadSupported } = useClipboard({
    resetAfterMs: 2000,
  });
  const [pasted, setPasted] = useState('');
  const pastedId = useId();

  return (
    <div className="stack">
      <Panel title="Copy a snippet">
        <pre className="card mono">
          <code>{SNIPPET}</code>
        </pre>
        <div className="row">
          <Button variant="primary" onClick={() => void copy(SNIPPET)} disabled={!isSupported}>
            {copied ? 'Copied!' : 'Copy command'}
          </Button>
          {/* Announced politely by screen readers; visual users see the button label change. */}
          <span role="status" aria-live="polite" className="small">
            {copied ? 'Copied to clipboard.' : ''}
          </span>
        </div>
        <p className="small">
          writeText:{' '}
          <Badge tone={isSupported ? 'success' : 'warn'}>
            {isSupported ? 'available' : 'unavailable'}
          </Badge>{' '}
          readText:{' '}
          <Badge tone={isReadSupported ? 'success' : 'warn'}>
            {isReadSupported ? 'available' : 'unavailable'}
          </Badge>
        </p>
        {isSupported ? null : (
          <Callout tone="warn" title="Secure context required">
            The async Clipboard API only exists on HTTPS pages and <code>localhost</code>.
          </Callout>
        )}
      </Panel>
      <Panel
        title="Paste (read)"
        description="Reading is more restricted: Chromium asks for permission, Safari and Firefox show a Paste prompt."
      >
        <div className="row">
          <Button
            onClick={async () => {
              const text = await read();
              if (text !== null) setPasted(text);
            }}
            disabled={!isReadSupported}
          >
            Paste from clipboard
          </Button>
          <Button variant="ghost" onClick={reset}>
            Reset status
          </Button>
        </div>
        <label className="field" htmlFor={pastedId}>
          <span className="field-label">Pasted text</span>
          <textarea
            id={pastedId}
            className="input"
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
          />
        </label>
      </Panel>
      {error ? (
        <Callout tone="danger" title="Clipboard error">
          {error.name}: {error.message}
        </Callout>
      ) : null}
    </div>
  );
}
