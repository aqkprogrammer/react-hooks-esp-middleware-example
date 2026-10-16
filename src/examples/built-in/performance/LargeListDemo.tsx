import { memo, useId, useMemo, useState } from 'react';
import { Button, Callout, Panel, RenderCount } from '../../../components/ui';
import { makeRows, type Row } from './workload';
import './performance.css';

const ALL_ROWS = makeRows(5000);
type SortKey = 'id' | 'score';

/**
 * Renders up to 5,000 table rows. `memo` on the row component makes
 * *unrelated* parent re-renders cheap, but mounting, sorting and filtering
 * still touch every row — only virtualization (rendering just the visible
 * window) removes that cost.
 */
export default function LargeListDemo() {
  const [count, setCount] = useState(5000);
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [memoRows, setMemoRows] = useState(true);
  const [clicks, setClicks] = useState(0);
  const countId = useId();

  const rows = useMemo(() => {
    const visible = ALL_ROWS.slice(0, count);
    return sortKey === 'id'
      ? visible
      : [...visible].sort((a, b) => b.score - a.score || a.id - b.id);
  }, [count, sortKey]);

  const RowComponent = memoRows ? MemoTableRow : TableRow;

  return (
    <div className="stack">
      <Panel
        title="Controls"
        description="Watch the commit time (from <Profiler>) next to the table after each action."
      >
        <div className="row">
          <label htmlFor={countId}>Rows</label>
          <select
            id={countId}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          >
            <option value={500}>500</option>
            <option value={5000}>5,000</option>
          </select>
          <Button onClick={() => setSortKey((key) => (key === 'id' ? 'score' : 'id'))}>
            Sort by {sortKey === 'id' ? 'score' : 'id'}
          </Button>
          <Button onClick={() => setClicks((value) => value + 1)}>
            Unrelated re-render ({clicks})
          </Button>
          <label className="row small">
            <input
              type="checkbox"
              checked={memoRows}
              onChange={(event) => setMemoRows(event.target.checked)}
            />
            memo() rows
          </label>
        </div>
      </Panel>
      <RenderCount label="Table">
        <div className="perf-table-wrap">
          <table className="perf-table">
            <caption className="visually-hidden">
              {rows.length} people sorted by {sortKey}
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Team</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <RowComponent key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </RenderCount>
      <Callout title="The real fix: virtualization">
        A user can only see ~20 rows at a time, yet the browser lays out and React reconciles all
        5,000. A virtualized list renders only the rows inside the scroll viewport (plus a small
        overscan) and positions them with a spacer, so cost no longer grows with the data. Use a
        maintained library such as TanStack Virtual or react-window rather than writing one;
        pagination or “show more” are simpler alternatives when they fit the UX.
      </Callout>
    </div>
  );
}

function TableRow({ row }: { row: Row }) {
  return (
    <tr>
      <td className="mono">{row.id}</td>
      <td>{row.name}</td>
      <td>{row.team}</td>
      <td className="mono">{row.score}</td>
    </tr>
  );
}

const MemoTableRow = memo(TableRow);
