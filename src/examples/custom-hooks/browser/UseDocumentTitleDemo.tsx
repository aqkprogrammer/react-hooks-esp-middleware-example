import { useState } from 'react';
import { Button, EventLog, Panel, TextField, useEventLog } from '../../../components/ui';
import { useDocumentTitle } from '../../../hooks';

/** Watch the browser tab's title while editing, mounting and unmounting. */
export default function UseDocumentTitleDemo() {
  const [title, setTitle] = useState('Inbox (3)');
  const [mounted, setMounted] = useState(true);
  const [restore, setRestore] = useState(true);
  const { entries, log, clear } = useEventLog(20);

  return (
    <div className="stack">
      <Panel title="Title owner" description="Look at your browser tab while you type.">
        <TextField
          label="Document title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <label className="row">
          <input
            type="checkbox"
            checked={restore}
            onChange={(event) => setRestore(event.target.checked)}
            disabled={mounted}
          />
          Restore the previous title on unmount
        </label>
        <p className="small muted">The restore option is fixed while the owner is mounted.</p>
        <div className="row">
          <Button variant="primary" onClick={() => setMounted((value) => !value)}>
            {mounted ? 'Unmount title owner' : 'Mount title owner'}
          </Button>
          <Button onClick={() => log(`document.title = “${document.title}”`)}>
            Log document.title
          </Button>
        </div>
        {mounted ? <TitleOwner title={title} restoreOnUnmount={restore} /> : null}
        <EventLog entries={entries} onClear={clear} />
      </Panel>
    </div>
  );
}

function TitleOwner({ title, restoreOnUnmount }: { title: string; restoreOnUnmount: boolean }) {
  useDocumentTitle(title, { restoreOnUnmount });
  return <p className="small">A mounted component is setting the title.</p>;
}
