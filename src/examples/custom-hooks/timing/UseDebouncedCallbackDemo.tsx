import { useState } from 'react';
import { Badge, Button, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useDebouncedCallback } from '../../../hooks';

/**
 * Autosave: saves 1 s after typing stops, but at least every 3 s while the
 * user keeps typing (maxWait). "Save now" flushes, "Discard" cancels.
 */
export default function UseDebouncedCallbackDemo() {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const [saves, setSaves] = useState(0);
  const { entries, log, clear } = useEventLog();

  const save = useDebouncedCallback(
    (value: string) => {
      setSaved(value);
      setSaves((n) => n + 1);
      log(`saved ${value.length} characters`, 'success');
    },
    1000,
    { maxWait: 3000 },
  );

  const dirty = text !== saved;

  return (
    <div className="stack">
      <Panel title="Autosaving note">
        <div className="field">
          <label htmlFor="debounced-callback-note" className="field-label">
            Note
          </label>
          <textarea
            id="debounced-callback-note"
            className="input"
            rows={4}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              save(event.target.value);
            }}
          />
        </div>
        <div className="row">
          <Button variant="primary" onClick={save.flush} disabled={!dirty}>
            Save now (flush)
          </Button>
          <Button
            onClick={() => {
              const pending = save.isPending();
              save.cancel();
              setText(saved);
              log(pending ? 'discarded the pending save' : 'nothing pending', 'warn');
            }}
            disabled={!dirty}
          >
            Discard changes (cancel)
          </Button>
          <Badge tone={dirty ? 'warn' : 'success'}>{dirty ? 'unsaved changes' : 'all saved'}</Badge>
        </div>
        <ValueTable
          label="Autosave state"
          rows={{ 'Saved characters': saved.length, 'Save calls': saves }}
        />
        <EventLog entries={entries} onClear={clear} />
      </Panel>
    </div>
  );
}
