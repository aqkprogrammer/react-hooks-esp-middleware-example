import {
  memo,
  Profiler,
  useCallback,
  useDeferredValue,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ProfilerOnRenderCallback,
  type ReactNode,
  type RefObject,
} from 'react';
import { Badge, Button, TextField } from '../../../components/ui';
import { useExternalStore, useScrollPosition } from '../../../hooks';
import {
  filterItems,
  generateItems,
  splitMatches,
  visibleRange,
  type CatalogItem,
} from './catalogData';
import {
  STRATEGIES,
  createMetricsRecorder,
  summarize,
  type MetricsRecorder,
  type MetricsState,
  type Strategy,
} from './metrics';

const ROW_HEIGHT = 36;
const VIEWPORT_HEIGHT = 360;
const OVERSCAN = 6;

export interface SearchBenchProps {
  itemCount: number;
  /** Default `'windowed'`, so opening the page does not mount every row at once. */
  initialStrategy?: Strategy;
}

/**
 * The benchmark: one search box, four rendering strategies, and measured
 * numbers. Everything shown in the metrics table is measured in this
 * browser — nothing is hard-coded.
 */
export function SearchBench({ itemCount, initialStrategy = 'windowed' }: SearchBenchProps) {
  const items = useMemo(() => generateItems(itemCount), [itemCount]);
  const [recorder] = useState(createMetricsRecorder);
  const [strategy, setStrategy] = useState<Strategy>(initialStrategy);
  const [query, setQuery] = useState('');
  const [transitionQuery, setTransitionQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const [pinned, setPinned] = useState<ReadonlySet<string>>(() => new Set());
  const strategyName = useId();

  // Stable identity, so memoised rows are not re-rendered by a new function prop.
  const togglePin = useCallback((id: string) => {
    setPinned((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const listQuery =
    strategy === 'naive' ? query : strategy === 'transition' ? transitionQuery : deferredQuery;
  const isStale = strategy === 'naive' ? false : query !== listQuery || isPending;

  const onListRender: ProfilerOnRenderCallback = (_id, _phase, actualDuration) =>
    recorder.profiled(strategy, 'list', actualDuration);
  const onWholeRender: ProfilerOnRenderCallback = (_id, _phase, actualDuration) =>
    recorder.profiled(strategy, 'whole', actualDuration);

  return (
    <div className="stack">
      <fieldset className="perf-strategies">
        <legend className="field-label">Rendering strategy</legend>
        {STRATEGIES.map((option) => (
          <label key={option.id} className="row small">
            <input
              type="radio"
              name={strategyName}
              checked={strategy === option.id}
              onChange={() => {
                setStrategy(option.id);
                setTransitionQuery(query);
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <Profiler id="search-keystroke" onRender={onWholeRender}>
        <TextField
          label={`Search ${items.length.toLocaleString('en-US')} items`}
          value={query}
          autoComplete="off"
          hint="Try “wireless”, “kit” or a SKU fragment. Type fast and watch the numbers."
          onChange={(event) => {
            const value = event.target.value;
            recorder.markInput(strategy, performance.now());
            setQuery(value);
            if (strategy === 'transition') startTransition(() => setTransitionQuery(value));
          }}
        />
        <Profiler id="search-results" onRender={onListRender}>
          {strategy === 'naive' ? (
            <NaiveResults
              items={items}
              query={listQuery}
              pinned={pinned}
              onTogglePin={togglePin}
              recorder={recorder}
            />
          ) : (
            <MemoResults
              items={items}
              query={listQuery}
              pinned={pinned}
              onTogglePin={togglePin}
              recorder={recorder}
              strategy={strategy}
              isStale={isStale}
            />
          )}
        </Profiler>
      </Profiler>

      <MetricsTable recorder={recorder} />
    </div>
  );
}

interface ResultsProps {
  items: readonly CatalogItem[];
  query: string;
  pinned: ReadonlySet<string>;
  onTogglePin: (id: string) => void;
  recorder: MetricsRecorder;
}

/** Reports "list committed for this query" from a layout effect (after DOM mutation, before paint). */
function useCommitReport(
  recorder: MetricsRecorder,
  strategy: Strategy,
  query: string,
  regionRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const rows = regionRef.current?.querySelectorAll('li').length ?? 0;
    recorder.listCommitted(strategy, performance.now(), rows);
  }, [recorder, strategy, query, regionRef]);
}

/** Strategy 1: filter during render and render every row; rows are not memoised. */
function NaiveResults({ items, query, pinned, onTogglePin, recorder }: ResultsProps) {
  const regionRef = useRef<HTMLDivElement>(null);
  const results = filterItems(items, query);
  useCommitReport(recorder, 'naive', query, regionRef);
  return (
    <ResultsFrame
      regionRef={regionRef}
      resetKey={query}
      count={results.length}
      total={items.length}
      isStale={false}
    >
      <ul className="perf-list" aria-label="Matching items">
        {results.map((item) => (
          <PlainRow
            key={item.id}
            item={item}
            query={query}
            pinned={pinned.has(item.id)}
            // A new function per row and per render: fine without memo, fatal to memo.
            onToggle={() => onTogglePin(item.id)}
          />
        ))}
      </ul>
    </ResultsFrame>
  );
}

/** Strategies 2–4: memoised filtering and rows; optionally windowed. */
const MemoResults = memo(function MemoResults({
  items,
  query,
  pinned,
  onTogglePin,
  recorder,
  strategy,
  isStale,
}: ResultsProps & { strategy: Exclude<Strategy, 'naive'>; isStale: boolean }) {
  const regionRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => filterItems(items, query), [items, query]);
  useCommitReport(recorder, strategy, query, regionRef);
  const renderRow = (item: CatalogItem) => (
    <MemoRow
      key={item.id}
      item={item}
      query={query}
      pinned={pinned.has(item.id)}
      onTogglePin={onTogglePin}
    />
  );
  return (
    <ResultsFrame
      regionRef={regionRef}
      resetKey={query}
      count={results.length}
      total={items.length}
      isStale={isStale}
    >
      {strategy === 'windowed' ? (
        // Remount on a new query: the window restarts at the top together with the scroll reset.
        <WindowedRows key={query} regionRef={regionRef} rows={results} renderRow={renderRow} />
      ) : (
        <ul className="perf-list" aria-label="Matching items">
          {results.map(renderRow)}
        </ul>
      )}
    </ResultsFrame>
  );
});

function ResultsFrame({
  regionRef,
  resetKey,
  count,
  total,
  isStale,
  children,
}: {
  regionRef: RefObject<HTMLDivElement | null>;
  /** A new query scrolls the results back to the top. */
  resetKey: string;
  count: number;
  total: number;
  isStale: boolean;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    if (regionRef.current) regionRef.current.scrollTop = 0;
  }, [regionRef, resetKey]);
  return (
    <div className="stack">
      <div className="spread small">
        <span>
          {count.toLocaleString('en-US')} of {total.toLocaleString('en-US')} items match
        </span>
        {isStale ? <Badge tone="warn">updating…</Badge> : null}
      </div>
      <div
        ref={regionRef}
        role="region"
        aria-label="Results"
        aria-busy={isStale}
        tabIndex={0}
        className={['perf-viewport', isStale ? 'perf-stale' : ''].join(' ').trim()}
        style={{ height: VIEWPORT_HEIGHT }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Fixed-row-height windowing: only rows intersecting the viewport (plus
 * overscan) are rendered, absolutely positioned inside a spacer as tall as
 * the full list, so the scrollbar stays truthful.
 */
function WindowedRows({
  regionRef,
  rows,
  renderRow,
}: {
  regionRef: RefObject<HTMLDivElement | null>;
  rows: readonly CatalogItem[];
  renderRow: (item: CatalogItem) => ReactNode;
}) {
  const { y } = useScrollPosition(regionRef);
  const { start, end } = visibleRange(y, VIEWPORT_HEIGHT, ROW_HEIGHT, rows.length, OVERSCAN);
  return (
    <ul
      className="perf-list perf-window"
      aria-label="Matching items"
      style={{ height: rows.length * ROW_HEIGHT }}
    >
      {rows.slice(start, end).map((item, offset) => (
        <WindowSlot key={item.id} index={start + offset} total={rows.length}>
          {renderRow(item)}
        </WindowSlot>
      ))}
    </ul>
  );
}

/** Positions one row; `aria-setsize/posinset` tell assistive tech where it is in the full list. */
function WindowSlot({
  index,
  total,
  children,
}: {
  index: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <li
      className="perf-slot"
      style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
      aria-setsize={total}
      aria-posinset={index + 1}
    >
      {children}
    </li>
  );
}

function RowContent({
  item,
  query,
  pinned,
  onToggle,
}: {
  item: CatalogItem;
  query: string;
  pinned: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="perf-row">
      <span className="perf-name">
        {splitMatches(item.name, query).map((part, index) =>
          part.match ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>,
        )}
      </span>
      <span className="muted small">{item.category}</span>
      <span className="mono small muted">{item.sku}</span>
      <button
        type="button"
        className="perf-pin"
        aria-pressed={pinned}
        aria-label={`Pin ${item.name}`}
        onClick={onToggle}
      >
        {pinned ? '★' : '☆'}
      </button>
    </div>
  );
}

function PlainRow(props: {
  item: CatalogItem;
  query: string;
  pinned: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <RowContent {...props} />
    </li>
  );
}

/** Re-renders only when its own item, query or pinned flag changes. */
const MemoRow = memo(function MemoRow({
  item,
  query,
  pinned,
  onTogglePin,
}: {
  item: CatalogItem;
  query: string;
  pinned: boolean;
  onTogglePin: (id: string) => void;
}) {
  return (
    <RowContent item={item} query={query} pinned={pinned} onToggle={() => onTogglePin(item.id)} />
  );
});

const selectAll = (state: MetricsState) => state.byStrategy;
const ms = (value: number | undefined) => (value === undefined ? '—' : `${value.toFixed(1)} ms`);

function MetricsTable({ recorder }: { recorder: MetricsRecorder }) {
  const byStrategy = useExternalStore(recorder.store, selectAll);
  return (
    <div className="stack">
      <div className="perf-table-wrap" role="region" aria-label="Measurements" tabIndex={0}>
        <table className="perf-table">
          <caption className="small muted">
            Measured in this browser (median of the last 20 samples; last value in brackets).
          </caption>
          <thead>
            <tr>
              <th scope="col">Strategy</th>
              <th scope="col">Keystroke → list committed</th>
              <th scope="col">Commit containing the keystroke</th>
              <th scope="col">List render (Profiler)</th>
              <th scope="col">Rows in DOM</th>
            </tr>
          </thead>
          <tbody>
            {STRATEGIES.map(({ id }) => {
              const metrics = byStrategy[id];
              const latency = summarize(metrics.latencies);
              const keystroke = summarize(metrics.keystrokeCommits);
              const list = summarize(metrics.listRenders);
              return (
                <tr key={id}>
                  <th scope="row">{id}</th>
                  <td>{latency ? `${ms(latency.median)} (${ms(latency.last)})` : '—'}</td>
                  <td>{keystroke ? `${ms(keystroke.median)} (${ms(keystroke.last)})` : '—'}</td>
                  <td>{list ? `${ms(list.median)} (${ms(list.last)})` : '—'}</td>
                  <td>
                    {metrics.latencies.length || metrics.listRenders.length
                      ? metrics.rowsInDom.toLocaleString('en-US')
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="row">
        <Button size="sm" onClick={recorder.reset}>
          Reset measurements
        </Button>
        <span className="small muted">
          Profiler columns stay empty in production builds, where <code>&lt;Profiler&gt;</code> is
          disabled; the keystroke latency is measured with <code>performance.now()</code> and works
          everywhere.
        </span>
      </div>
    </div>
  );
}
