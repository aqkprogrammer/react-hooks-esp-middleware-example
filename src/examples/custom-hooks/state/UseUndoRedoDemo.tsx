import { Badge, Button, Panel, TextField, ValueTable } from '../../../components/ui';
import { useEventListener, useUndoRedo } from '../../../hooks';
import './UseUndoRedoDemo.css';

const SIZE = 8;

interface Drawing {
  title: string;
  cells: readonly boolean[];
}

const INITIAL: Drawing = { title: 'Untitled', cells: Array<boolean>(SIZE * SIZE).fill(false) };

/**
 * A tiny pixel editor: painting a cell is one undo step, while typing in the
 * title is coalesced into one step per burst (pauses > 1 s start a new step).
 */
export default function UseUndoRedoDemo() {
  const history = useUndoRedo<Drawing>(INITIAL, { limit: 50, coalesceWindowMs: 1000 });
  const { present } = history;

  useEventListener('keydown', (event) => {
    // Ctrl on Windows/Linux, ⌘ on macOS.
    if (!event.ctrlKey && !event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      history.undo();
    } else if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      history.redo();
    }
  });

  const paint = (index: number) =>
    history.set((drawing) => ({
      ...drawing,
      cells: drawing.cells.map((on, i) => (i === index ? !on : on)),
    }));

  return (
    <div className="stack">
      <Panel
        title="Pixel editor"
        description={
          <>
            Undo with <kbd className="kbd">Ctrl</kbd>/<kbd className="kbd">⌘</kbd> +{' '}
            <kbd className="kbd">Z</kbd>, redo with <kbd className="kbd">Shift</kbd> +{' '}
            <kbd className="kbd">Z</kbd> or <kbd className="kbd">Ctrl</kbd> +{' '}
            <kbd className="kbd">Y</kbd>.
          </>
        }
      >
        <TextField
          label="Title (typing is coalesced)"
          value={present.title}
          onChange={(event) => {
            const title = event.target.value;
            history.set((drawing) => ({ ...drawing, title }), { coalesceKey: 'title' });
          }}
        />
        <div className="use-undo-redo-grid" role="group" aria-label={`Canvas: ${present.title}`}>
          {present.cells.map((on, index) => (
            <button
              key={index}
              type="button"
              className="use-undo-redo-cell"
              aria-pressed={on}
              aria-label={`Row ${Math.floor(index / SIZE) + 1}, column ${(index % SIZE) + 1}`}
              onClick={() => paint(index)}
            />
          ))}
        </div>
        <div className="row">
          <Button onClick={history.undo} disabled={!history.canUndo}>
            Undo
          </Button>
          <Button onClick={history.redo} disabled={!history.canRedo}>
            Redo
          </Button>
          <Button variant="ghost" onClick={() => history.reset()}>
            Reset history
          </Button>
          <Badge tone="info">{history.past.length} / 50 undo steps</Badge>
        </div>
        <ValueTable
          label="History"
          rows={{
            'Undo steps (past)': history.past.length,
            'Redo steps (future)': history.future.length,
            'Painted cells': present.cells.filter(Boolean).length,
          }}
        />
      </Panel>
    </div>
  );
}
