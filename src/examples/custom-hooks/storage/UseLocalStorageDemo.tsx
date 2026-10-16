import { useState } from 'react';
import { Button, Callout, Panel, TextField, ValueTable, show } from '../../../components/ui';
import { useLocalStorage, type StorageError } from '../../../hooks';

const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * Two independent components bound to the same key stay in sync, the value
 * survives reloads, and opening this page in a second tab syncs both tabs.
 */
export default function UseLocalStorageDemo() {
  const [lastError, setLastError] = useState<StorageError | null>(null);
  return (
    <div className="stack">
      <Panel title="Editor" description="Type, reload the page, or open this page in another tab.">
        <NoteEditor onError={setLastError} />
      </Panel>
      <Panel title="A second component reading the same key">
        <NotePreview />
      </Panel>
      <Panel title="Corrupt stored data">
        <CorruptionControls />
      </Panel>
      {lastError ? (
        <Callout tone="warn" title={`Storage error: ${lastError.kind}`}>
          {show(lastError.error)}
        </Callout>
      ) : null}
    </div>
  );
}

function NoteEditor({ onError }: { onError: (error: StorageError) => void }) {
  const [note, setNote, removeNote] = useLocalStorage('playground:note', '', {
    validate: isString,
    onError,
  });
  return (
    <div className="stack">
      <TextField
        label="Note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Persisted to localStorage"
      />
      <div className="row">
        <Button onClick={() => setNote((previous) => previous.toUpperCase())}>
          Uppercase (functional update)
        </Button>
        <Button variant="danger" onClick={removeNote}>
          Remove key
        </Button>
      </div>
    </div>
  );
}

function NotePreview() {
  const [note] = useLocalStorage('playground:note', '', { validate: isString });
  return <ValueTable label="Stored note" rows={{ value: show(note), length: note.length }} />;
}

function CorruptionControls() {
  return (
    <div className="row">
      <Button
        onClick={() => {
          window.localStorage.setItem('playground:note', '{not valid json');
          // Simulate a write from another tab so subscribers re-read the key.
          window.dispatchEvent(new StorageEvent('storage', { key: 'playground:note' }));
        }}
      >
        Write invalid JSON
      </Button>
      <Button
        onClick={() => {
          window.localStorage.setItem('playground:note', JSON.stringify(42));
          window.dispatchEvent(new StorageEvent('storage', { key: 'playground:note' }));
        }}
      >
        Write a number (fails validation)
      </Button>
    </div>
  );
}
