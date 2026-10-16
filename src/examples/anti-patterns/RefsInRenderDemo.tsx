import { useEffect, useId, useRef, useState } from 'react';
import { Button, Callout, Panel, ValueTable } from '../../components/ui';

interface ClickStats {
  clicks: number;
  /** Milliseconds between the last two clicks, or null before the second click. */
  lastIntervalMs: number | null;
}

/**
 * Corrected version of broken/RefsDuringRender.tsx. Anything the UI shows is
 * state; refs hold values only event handlers and effects need (the last
 * click time, a DOM node, a commit counter written to the DOM).
 */
export default function RefsInRenderDemo() {
  const [stats, setStats] = useState<ClickStats>({ clicks: 0, lastIntervalMs: null });
  const lastClickAt = useRef<number | null>(null);
  const commits = useRef(0);
  const commitOutput = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentId = useId();

  // ✅ Refs are read and written after commit, not during render.
  useEffect(() => {
    commits.current += 1;
    if (commitOutput.current) commitOutput.current.textContent = String(commits.current);
  });

  return (
    <div className="stack">
      <Panel title="Click stats">
        <Button
          variant="primary"
          onClick={(event) => {
            // ✅ Event handlers may read the clock and refs.
            const now = event.timeStamp;
            const previous = lastClickAt.current;
            lastClickAt.current = now;
            setStats((current) => ({
              clicks: current.clicks + 1,
              lastIntervalMs: previous === null ? null : Math.round(now - previous),
            }));
          }}
        >
          Click
        </Button>
        <ValueTable
          rows={{
            Clicks: stats.clicks,
            'Time between last two clicks':
              stats.lastIntervalMs === null ? '—' : `${stats.lastIntervalMs} ms`,
          }}
        />
        <p className="small muted">
          Commits (written to the DOM from an effect): <span ref={commitOutput}>0</span>
        </p>
      </Panel>
      <Panel title="A DOM ref used from an event handler">
        <div className="field">
          <label className="field-label" htmlFor={commentId}>
            Comment
          </label>
          <input ref={inputRef} id={commentId} className="input" />
        </div>
        <Button onClick={() => inputRef.current?.focus()}>Focus the comment field</Button>
      </Panel>
      <Callout title="Rule">
        If a value is rendered, it is state (or derived from state). Refs are for values that must
        survive renders <em>without</em> causing them.
      </Callout>
    </div>
  );
}
