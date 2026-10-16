import { Suspense, use, useId, useState, type KeyboardEvent } from 'react';
import { loadSource } from '../modules';
import { CodeBlock } from './CodeBlock';
import { ErrorBoundary } from './ErrorBoundary';

const GITHUB_BLOB =
  'https://github.com/aqkprogrammer/react-hooks-esp-middleware-example/blob/main/src/';

/** Tabbed viewer over the real source files of an entry (WAI-ARIA tabs pattern). */
export function SourceViewer({ files }: { files: readonly string[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const current = files[active] ?? files[0];
  if (!current) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let next = active;
    if (event.key === 'ArrowRight') next = (active + 1) % files.length;
    else if (event.key === 'ArrowLeft') next = (active - 1 + files.length) % files.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = files.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  return (
    <div className="source-viewer">
      {files.length > 1 ? (
        <div role="tablist" aria-label="Source files" className="tabs">
          {files.map((file, index) => (
            <button
              key={file}
              id={`${baseId}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-controls={`${baseId}-panel`}
              tabIndex={index === active ? 0 : -1}
              className="tab"
              onClick={() => setActive(index)}
              onKeyDown={onKeyDown}
            >
              {file.split('/').pop()}
            </button>
          ))}
        </div>
      ) : null}
      <div
        id={`${baseId}-panel`}
        role={files.length > 1 ? 'tabpanel' : undefined}
        aria-labelledby={files.length > 1 ? `${baseId}-tab-${active}` : undefined}
      >
        <p className="small muted source-path">
          <code>src/{current}</code> ·{' '}
          <a href={`${GITHUB_BLOB}${current}`} target="_blank" rel="noreferrer">
            View on GitHub
          </a>
        </p>
        <ErrorBoundary fallback={(error) => <p className="field-error">{error.message}</p>}>
          <Suspense fallback={<p className="muted">Loading source…</p>}>
            <LoadedSource path={current} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function LoadedSource({ path }: { path: string }) {
  const code = use(loadSource(path));
  return <CodeBlock code={code.trimEnd()} label={path.split('/').pop()} />;
}
