import { useReducer, type KeyboardEvent } from 'react';
import { Button, Panel, ValueTable } from '../../../components/ui';
import {
  clearHistory,
  createUndoableState,
  redo,
  undo,
  undoable,
} from '../../../middleware/reducer';
import { blankCanvas, canvasReducer, SIZE } from './pixelArt';
import './UndoRedoDemo.css';

const HISTORY_LIMIT = 20;

/**
 * Created once at module level: an enhanced reducer is just a function.
 * `focus` actions update the present but are not worth an undo step.
 */
const undoableCanvas = undoable(canvasReducer, {
  limit: HISTORY_LIMIT,
  shouldRecord: (action) => action.type !== 'focus',
});

/** Undo/redo for any reducer by wrapping it — no middleware involved. */
export default function UndoRedoDemo() {
  const [history, dispatch] = useReducer(undoableCanvas, blankCanvas, createUndoableState);
  const { past, present, future } = history;
  const filled = present.cells.filter(Boolean).length;

  // Attached to each cell (an interactive element) rather than the grid.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod || event.key.toLowerCase() !== 'z') return;
    event.preventDefault();
    dispatch(event.shiftKey ? redo() : undo());
  };

  return (
    <div className="stack">
      <Panel
        title="Pixel canvas"
        description="Click cells to paint. With a cell focused, Ctrl/⌘+Z undoes and Ctrl/⌘+Shift+Z redoes."
      >
        <div
          role="group"
          aria-label="Canvas"
          className="undo-grid"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 2.25rem)` }}
        >
          {present.cells.map((on, index) => (
            <button
              key={index}
              type="button"
              className="undo-cell"
              aria-pressed={on}
              aria-label={`Row ${Math.floor(index / SIZE) + 1}, column ${(index % SIZE) + 1}`}
              onClick={() => dispatch({ type: 'toggle', index })}
              onFocus={() => dispatch({ type: 'focus', index })}
              onKeyDown={onKeyDown}
            >
              {on ? '■' : ''}
            </button>
          ))}
        </div>
        <div className="row">
          <Button onClick={() => dispatch(undo())} disabled={past.length === 0}>
            Undo
          </Button>
          <Button onClick={() => dispatch(redo())} disabled={future.length === 0}>
            Redo
          </Button>
          <Button onClick={() => dispatch({ type: 'fillRow', row: 0 })}>Fill first row</Button>
          <Button variant="ghost" onClick={() => dispatch({ type: 'clear' })}>
            Clear canvas
          </Button>
          <Button
            variant="ghost"
            onClick={() => dispatch(clearHistory())}
            disabled={past.length === 0 && future.length === 0}
          >
            Forget history
          </Button>
        </div>
      </Panel>
      <Panel title="History">
        <ValueTable
          rows={{
            'Filled cells': filled,
            'Undo steps (past)': `${past.length} / ${HISTORY_LIMIT}`,
            'Redo steps (future)': future.length,
            'Last focused cell': present.cursor === null ? '—' : present.cursor + 1,
          }}
        />
      </Panel>
    </div>
  );
}
