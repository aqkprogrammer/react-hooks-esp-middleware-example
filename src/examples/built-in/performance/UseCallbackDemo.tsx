import { memo, useCallback, useState } from 'react';
import { Callout, Panel, RenderCount, TextField, ValueTable } from '../../../components/ui';
import { makeRows, simulateWork, type Row } from './workload';

const ROWS = makeRows(40);

/**
 * `useCallback` only pays off when the function's identity matters: here it
 * is a prop of a `memo()` child. Type in the note field (state the list does
 * not use) and watch the list's commit counter.
 */
export default function UseCallbackDemo() {
  const [note, setNote] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stableCallback, setStableCallback] = useState(true);

  // Both callbacks are created on every render; useCallback hands back the
  // *previous* function object while its dependencies are unchanged.
  const memoisedSelect = useCallback((id: number) => setSelectedId(id), []);
  const inlineSelect = (id: number) => setSelectedId(id);
  const onSelect = stableCallback ? memoisedSelect : inlineSelect;

  return (
    <div className="stack">
      <Panel title="Parent" description="The note is parent state that the list does not display.">
        <TextField
          label="Note (unrelated to the list)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <label className="row small">
          <input
            type="checkbox"
            checked={stableCallback}
            onChange={(event) => setStableCallback(event.target.checked)}
          />
          Wrap <code>onSelect</code> in useCallback
        </label>
        <ValueTable
          rows={{
            'onSelect identity': stableCallback ? 'stable across renders' : 'new every render',
            Selected: selectedId === null ? 'nothing' : `row ${selectedId}`,
          }}
        />
      </Panel>
      <Panel title="memo() child (each row costs ~0.2 ms to render)">
        <SelectableList rows={ROWS} selectedId={selectedId} onSelect={onSelect} />
      </Panel>
      <Callout title="useCallback without memo() does nothing useful">
        If <code>SelectableList</code> were not wrapped in <code>memo</code>, it would re-render
        with the parent no matter how stable <code>onSelect</code> is.
      </Callout>
    </div>
  );
}

interface SelectableListProps {
  rows: readonly Row[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const SelectableList = memo(function SelectableList({
  rows,
  selectedId,
  onSelect,
}: SelectableListProps) {
  // RenderCount lives *inside* the memoised component, so it only counts
  // commits in which memo() actually let the list re-render.
  return (
    <RenderCount label="SelectableList">
      <ul className="list" aria-label="Selectable rows">
        {rows.map((row) => (
          <SlowRow key={row.id} row={row} selected={row.id === selectedId} onSelect={onSelect} />
        ))}
      </ul>
    </RenderCount>
  );
});

function SlowRow({
  row,
  selected,
  onSelect,
}: {
  row: Row;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  simulateWork(0.2);
  return (
    <li className={selected ? 'active' : undefined}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-pressed={selected}
        onClick={() => onSelect(row.id)}
      >
        {row.name}
      </button>
    </li>
  );
}
