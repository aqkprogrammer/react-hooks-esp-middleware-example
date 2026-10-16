import { StrictMode, Suspense, useState } from 'react';
import { Button, Callout } from '../../components/ui';
import { demos } from '../modules';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Hosts a live demo: lazy-loaded, isolated by an error boundary, resettable
 * (remounts with a new key) and optionally wrapped in <StrictMode> so you
 * can watch development-only double effects.
 */
export function DemoFrame({ path, title }: { path: string; title: string }) {
  const [instance, setInstance] = useState(0);
  const [strict, setStrict] = useState(false);
  const Demo = demos[path];

  if (!Demo) {
    return (
      <Callout tone="danger" title="Demo not found">
        <code>{path}</code>
      </Callout>
    );
  }

  const content = (
    <ErrorBoundary
      resetKey={instance}
      fallback={(error, reset) => (
        <Callout tone="danger" title="This demo crashed">
          <p className="mono small">{error.message}</p>
          <Button onClick={reset}>Try again</Button>
        </Callout>
      )}
    >
      <Suspense fallback={<p className="muted">Loading demo…</p>}>
        <Demo key={instance} />
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <section className="demo-frame" aria-label={`Live demo: ${title}`}>
      <div className="demo-toolbar">
        <span className="demo-toolbar-title">Live demo</span>
        <div className="row">
          <label className="checkbox small">
            <input
              type="checkbox"
              checked={strict}
              onChange={(event) => {
                setStrict(event.target.checked);
                setInstance((value) => value + 1);
              }}
            />
            Strict Mode
          </label>
          <Button size="sm" onClick={() => setInstance((value) => value + 1)}>
            Reset demo
          </Button>
        </div>
      </div>
      <div className="demo-body">{strict ? <StrictMode>{content}</StrictMode> : content}</div>
    </section>
  );
}
