import { memo, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Button, Callout, Panel, RenderCount } from '../../../components/ui';

const CARD_STYLE = { padding: '0.5rem' } as const;

/**
 * Two common ways memoisation silently stops working — new object/array
 * identities in props and in dependency lists — plus the cases where it was
 * never needed in the first place.
 */
export default function MemoizationPitfallsDemo() {
  const [page, setPage] = useState(1);
  const [unrelated, setUnrelated] = useState(0);

  return (
    <div className="stack">
      <Panel title="Controls" description={`page = ${page}; unrelated renders = ${unrelated}`}>
        <div className="row">
          <Button onClick={() => setUnrelated((value) => value + 1)}>Unrelated re-render</Button>
          <Button onClick={() => setPage((value) => value + 1)}>Next page</Button>
        </div>
      </Panel>
      <DependencyShapes page={page} />
      <InlinePropPanel page={page} />
      <Callout title="When memoisation is unnecessary">
        <ul>
          <li>
            The calculation is cheap (filtering tens or hundreds of items, string formatting).
          </li>
          <li>
            The child is not wrapped in <code>memo</code>, or it receives a new object, array, JSX{' '}
            <code>children</code> or inline function anyway.
          </li>
          <li>
            The value is a primitive — strings, numbers and booleans are already compared by value.
          </li>
          <li>
            The callback goes to a DOM element (<code>&lt;button onClick&gt;</code>) — DOM elements
            do not skip renders.
          </li>
          <li>
            Fix structure first: move state down, or pass components as <code>children</code>, so
            fewer components re-render at all.
          </li>
        </ul>
      </Callout>
    </div>
  );
}

/**
 * Counts how often an effect with `deps` would run: React compares every
 * dependency with `Object.is` against the previous render's list. The effect
 * itself has no dependency array (it runs after every commit) and only
 * writes to the DOM, so measuring never causes a render.
 */
function useDependencyRunCounter(
  deps: readonly unknown[],
  outputRef: RefObject<HTMLElement | null>,
) {
  const previousRef = useRef<readonly unknown[] | null>(null);
  const runsRef = useRef(0);
  useEffect(() => {
    const previous = previousRef.current;
    const changed =
      previous === null ||
      previous.length !== deps.length ||
      deps.some((dependency, index) => !Object.is(dependency, previous[index]));
    previousRef.current = deps;
    if (changed) {
      runsRef.current += 1;
      if (outputRef.current) outputRef.current.textContent = String(runsRef.current);
    }
  });
}

function DependencyShapes({ page }: { page: number }) {
  const primitiveRef = useRef<HTMLElement>(null);
  const literalRef = useRef<HTMLElement>(null);
  const memoRef = useRef<HTMLElement>(null);
  const memoisedFilters = useMemo(() => ({ page }), [page]);

  useDependencyRunCounter([page], primitiveRef);
  useDependencyRunCounter([{ page }], literalRef);
  useDependencyRunCounter([memoisedFilters], memoRef);

  return (
    <Panel
      title="Dependency shapes"
      description="How many times an effect with each dependency list would run."
    >
      <table className="perf-table">
        <caption className="visually-hidden">Effect runs per dependency list</caption>
        <thead>
          <tr>
            <th scope="col">Dependency list</th>
            <th scope="col">Effect runs</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="mono">
              [page]
            </th>
            <td>
              <strong ref={primitiveRef}>0</strong>
            </td>
          </tr>
          <tr>
            <th scope="row" className="mono">
              [{'{ page }'}] — object literal
            </th>
            <td>
              <strong ref={literalRef}>0</strong>
            </td>
          </tr>
          <tr>
            <th scope="row" className="mono">
              [useMemo(() =&gt; ({'{ page }'}), [page])]
            </th>
            <td>
              <strong ref={memoRef}>0</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}

function InlinePropPanel({ page }: { page: number }) {
  return (
    <Panel
      title="memo() defeated by an inline object prop"
      description="Both cards are memo() components and receive the same values."
    >
      <div className="perf-columns">
        <MemoCard label="style={{ padding }} inline" page={page} style={{ padding: '0.5rem' }} />
        <MemoCard label="style={CARD_STYLE} constant" page={page} style={CARD_STYLE} />
      </div>
    </Panel>
  );
}

const MemoCard = memo(function MemoCard({
  label,
  page,
  style,
}: {
  label: string;
  page: number;
  style: { padding: string };
}) {
  return (
    <RenderCount label={label}>
      <div className="card" style={style}>
        Page {page}
      </div>
    </RenderCount>
  );
});
