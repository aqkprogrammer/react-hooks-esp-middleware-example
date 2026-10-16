import { useState } from 'react';
import { Button, EventLog, Panel, useEventLog } from '../../../components/ui';
import { useDialogState } from '../../../hooks';
import './UseDialogStateDemo.css';

/**
 * A confirmation built on a native <dialog>: Escape, focus containment, the
 * backdrop and focus restoration all come from the browser.
 */
export default function UseDialogStateDemo() {
  const [projects, setProjects] = useState(['Website redesign', 'Mobile app', 'Docs site']);
  const [target, setTarget] = useState<string | null>(null);
  const [backdropCloses, setBackdropCloses] = useState(true);
  const [escapeCloses, setEscapeCloses] = useState(true);
  const { entries, log, clear } = useEventLog();

  const dialog = useDialogState({
    closeOnBackdropClick: backdropCloses,
    closeOnEscape: escapeCloses,
    onClose: (returnValue) => {
      if (returnValue === 'delete' && target) {
        setProjects((previous) => previous.filter((project) => project !== target));
        log(`deleted “${target}”`, 'success');
      } else {
        log(`closed with returnValue ${JSON.stringify(returnValue)}`);
      }
    },
  });

  return (
    <div className="stack">
      <Panel title="Projects" description="Delete asks for confirmation in a modal <dialog>.">
        <ul className="list">
          {projects.map((project) => (
            <li key={project} className="spread">
              <span>{project}</span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setTarget(project);
                  dialog.open();
                }}
              >
                Delete <span className="visually-hidden">{project}</span>
              </Button>
            </li>
          ))}
          {projects.length === 0 ? <li className="muted">No projects left.</li> : null}
        </ul>
        <div className="row">
          <label className="row">
            <input
              type="checkbox"
              checked={backdropCloses}
              onChange={(event) => setBackdropCloses(event.target.checked)}
            />
            Clicking the backdrop cancels
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={escapeCloses}
              onChange={(event) => setEscapeCloses(event.target.checked)}
            />
            Escape cancels
          </label>
        </div>
        <p className="muted small">
          Dialog state: {dialog.isOpen ? 'open' : 'closed'}; last returnValue:{' '}
          {dialog.returnValue === undefined ? '—' : JSON.stringify(dialog.returnValue)}
        </p>
      </Panel>
      <EventLog entries={entries} onClear={clear} />

      <dialog {...dialog.dialogProps} className="dialog-demo">
        <form method="dialog" className="stack">
          <h4 id={dialog.titleId} className="dialog-demo-title">
            Delete “{target}”?
          </h4>
          <p>This permanently removes the project and its history.</p>
          <div className="row dialog-demo-actions">
            {/* showModal() focuses the first focusable element: keep the safe choice first. */}
            <button type="submit" value="cancel" className="btn">
              Cancel
            </button>
            <button type="submit" value="delete" className="btn btn-danger">
              Delete project
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
