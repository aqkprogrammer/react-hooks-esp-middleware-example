import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { formatShortcut, isApplePlatform, useKeyboardShortcut, useUndoRedo } from '../../../hooks';
import { toggleLinePrefix, wrapSelection, type TextEdit } from './editorText';
import { MarkdownPreview } from './MarkdownPreview';
import './UndoRedoEditorScenario.css';

/** One immutable history snapshot. `label` describes the change that produced it. */
interface NoteSnapshot {
  title: string;
  body: string;
  label: string;
}

const INITIAL_NOTE: NoteSnapshot = {
  title: 'Release notes',
  body: '# Highlights\n- Faster search\n- **Undo** everywhere',
  label: 'Opened note',
};

/** Typing pauses longer than this start a new undo step. */
const COALESCE_WINDOW_MS = 800;
const HISTORY_LIMIT = 100;

const subscribeNever = () => () => {};
// The platform cannot be known on the server: render Ctrl labels first, then
// switch after hydration (useSyncExternalStore handles the mismatch for us).
const getServerApple = () => false;

/**
 * A small note editor whose history is managed by `useUndoRedo`:
 * coalesced typing, discrete toolbar steps, Ctrl/⌘+Z, Shift+Ctrl/⌘+Z and
 * Ctrl+Y scoped to the editor region, and a clickable history panel.
 */
export default function UndoRedoEditorScenario() {
  const history = useUndoRedo<NoteSnapshot>(INITIAL_NOTE, {
    limit: HISTORY_LIMIT,
    coalesceWindowMs: COALESCE_WINDOW_MS,
  });
  const { present, past, future, canUndo, canRedo, set, undo, redo, reset } = history;
  const apple = useSyncExternalStore(subscribeNever, isApplePlatform, getServerApple);
  const editorRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<TextEdit | null>(null);
  const [scratch, setScratch] = useState('');
  const bodyId = useId();
  const shortcutHelpId = useId();

  // Shortcuts listen on the editor region only (not window): Ctrl+Z inside
  // the unrelated "Scratch pad" field below keeps the browser's native undo.
  // Inside the region every field is part of the document, so they *should*
  // use the document history (allowInInputs).
  const shortcutOptions = { target: editorRef, allowInInputs: true, allowRepeat: true };
  useKeyboardShortcut('mod+z', undo, shortcutOptions);
  // Ctrl+Y is the Windows/Linux convention; on macOS Ctrl+Y is a text-editing
  // binding ("yank"), so only ⇧⌘Z is registered there.
  useKeyboardShortcut(apple ? 'mod+shift+z' : ['mod+shift+z', 'ctrl+y'], redo, shortcutOptions);

  // After a toolbar command, restore the selection once the new text is in
  // the DOM. Runs before paint, so the caret never visibly jumps.
  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    const textarea = bodyRef.current;
    if (!selection || !textarea) return;
    pendingSelection.current = null;
    textarea.focus();
    textarea.setSelectionRange(selection.selectionStart, selection.selectionEnd);
  }, [present]);

  const applyCommand = (label: string, command: (textarea: HTMLTextAreaElement) => TextEdit) => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const edit = command(textarea);
    pendingSelection.current = edit;
    // No coalesceKey: every toolbar command is its own undo step.
    set((previous) => ({ ...previous, body: edit.text, label }));
  };

  const entries = [...past, present, ...future];
  const presentIndex = past.length;
  const jumpTo = (index: number) => {
    for (let step = index; step < presentIndex; step += 1) undo();
    for (let step = presentIndex; step < index; step += 1) redo();
  };

  const undoLabel = formatShortcut('mod+z', { apple });
  const redoLabel = apple
    ? formatShortcut('mod+shift+z', { apple })
    : `${formatShortcut('mod+shift+z', { apple })} or ${formatShortcut('ctrl+y', { apple })}`;

  return (
    <div className="stack">
      <div className="undo-editor-layout">
        <Panel
          title="Note editor"
          description={
            <span id={shortcutHelpId}>
              Undo with <kbd className="kbd">{undoLabel}</kbd>, redo with{' '}
              <kbd className="kbd">{redoLabel}</kbd> while focus is inside the editor.
            </span>
          }
        >
          <div ref={editorRef} className="stack" role="group" aria-label="Note editor">
            <div className="row" role="group" aria-label="Edit history and formatting">
              <Button
                onClick={undo}
                disabled={!canUndo}
                aria-keyshortcuts={apple ? 'Meta+Z' : 'Control+Z'}
              >
                Undo
              </Button>
              <Button
                onClick={redo}
                disabled={!canRedo}
                aria-keyshortcuts={apple ? 'Meta+Shift+Z' : 'Control+Shift+Z Control+Y'}
              >
                Redo
              </Button>
              <span className="undo-editor-divider" aria-hidden="true" />
              <Button
                size="sm"
                onClick={() =>
                  applyCommand('Bold', (textarea) =>
                    wrapSelection(
                      textarea.value,
                      textarea.selectionStart,
                      textarea.selectionEnd,
                      '**',
                    ),
                  )
                }
              >
                Bold
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  applyCommand('Toggle heading', (textarea) =>
                    toggleLinePrefix(textarea.value, textarea.selectionStart, '# '),
                  )
                }
              >
                Heading
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  applyCommand('Toggle bullet', (textarea) =>
                    toggleLinePrefix(textarea.value, textarea.selectionStart, '- '),
                  )
                }
              >
                Bullet
              </Button>
            </div>
            <TextField
              label="Title"
              value={present.title}
              aria-describedby={shortcutHelpId}
              onChange={(event) => {
                const title = event.target.value;
                set((previous) => ({ ...previous, title, label: 'Edited title' }), {
                  coalesceKey: 'title',
                });
              }}
            />
            <div className="field">
              <label htmlFor={bodyId} className="field-label">
                Body
              </label>
              <textarea
                id={bodyId}
                ref={bodyRef}
                className="undo-editor-body"
                rows={8}
                value={present.body}
                aria-describedby={shortcutHelpId}
                onChange={(event) => {
                  const body = event.target.value;
                  set((previous) => ({ ...previous, body, label: 'Typed in body' }), {
                    coalesceKey: 'body',
                  });
                }}
              />
              <p className="field-hint">
                Supports <code># heading</code>, <code>- bullet</code> and <code>**bold**</code>.
              </p>
            </div>
            <div className="row">
              <Button variant="danger" size="sm" onClick={() => reset()}>
                Discard changes and history
              </Button>
              <Badge tone="info">
                {past.length} undo / {future.length} redo (limit {HISTORY_LIMIT})
              </Badge>
            </div>
          </div>
        </Panel>

        <Panel title="History" description="Oldest first. Select a step to jump to it.">
          <ol className="undo-editor-history" aria-label="History">
            {entries.map((entry, index) => (
              <li key={index}>
                <button
                  type="button"
                  className="undo-editor-step"
                  aria-current={index === presentIndex ? 'step' : undefined}
                  onClick={() => jumpTo(index)}
                >
                  <span className="mono small">{index + 1}.</span> {entry.label}
                  {index === presentIndex ? <Badge tone="success">current</Badge> : null}
                  {index > presentIndex ? <span className="muted small">(redo)</span> : null}
                </button>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel title="Preview">
        <MarkdownPreview title={present.title} body={present.body} />
      </Panel>

      <Panel
        title="Outside the editor"
        description="Shortcuts are scoped: undo here is the browser's own, not the note history."
      >
        <TextField
          label="Scratch pad (not part of the note history)"
          value={scratch}
          onChange={(event) => setScratch(event.target.value)}
        />
      </Panel>

      <Callout title="How the history is shaped">
        Keystrokes in the same field less than {COALESCE_WINDOW_MS} ms apart are merged into one
        step (<code>coalesceKey</code>), so undo removes a burst of typing rather than one
        character. Toolbar commands are always separate steps, switching fields starts a new step,
        and a new edit after undo discards the redo stack.
      </Callout>
    </div>
  );
}
