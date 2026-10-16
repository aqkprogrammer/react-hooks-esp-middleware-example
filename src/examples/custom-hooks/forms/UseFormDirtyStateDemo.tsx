import { useId, useState } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { useFormDirtyState } from '../../../hooks';

interface Profile {
  name: string;
  bio: string;
  newsletter: boolean;
}

const LABELS: Record<keyof Profile, string> = {
  name: 'Display name',
  bio: 'Bio',
  newsletter: 'Newsletter',
};

/** A profile editor with "unsaved changes" tracking against the last saved values. */
export default function UseFormDirtyStateDemo() {
  const [saved, setSaved] = useState<Profile>({
    name: 'Ada',
    bio: 'Mathematician',
    newsletter: false,
  });
  const [values, setValues] = useState<Profile>(saved);
  const [warn, setWarn] = useState(true);
  const [message, setMessage] = useState('');
  const bioId = useId();
  const { isDirty, dirtyFields } = useFormDirtyState(values, saved, { warnOnUnload: warn });

  const update = <K extends keyof Profile>(name: K, value: Profile[K]) =>
    setValues((previous) => ({ ...previous, [name]: value }));

  return (
    <div className="stack">
      <Panel
        title="Edit profile"
        description="Change a field, then change it back: the form is clean again."
      >
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(values);
            setMessage('Saved. The saved values are the new baseline.');
          }}
        >
          <TextField
            label={LABELS.name}
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
          />
          <div className="field">
            <label htmlFor={bioId} className="field-label">
              {LABELS.bio}
            </label>
            <textarea
              id={bioId}
              rows={3}
              value={values.bio}
              onChange={(event) => update('bio', event.target.value)}
            />
          </div>
          <label className="row">
            <input
              type="checkbox"
              checked={values.newsletter}
              onChange={(event) => update('newsletter', event.target.checked)}
            />
            Subscribe to the newsletter
          </label>
          <div className="row">
            <Button type="submit" variant="primary" disabled={!isDirty}>
              Save
            </Button>
            <Button
              variant="ghost"
              disabled={!isDirty}
              onClick={() => {
                setValues(saved);
                setMessage('Changes discarded.');
              }}
            >
              Discard changes
            </Button>
          </div>
        </form>
        <p role="status" className="small">
          {message}
        </p>
      </Panel>
      <Panel title="Dirty state">
        <div className="row">
          {isDirty ? (
            <Badge tone="warn">Unsaved changes</Badge>
          ) : (
            <Badge tone="success">All changes saved</Badge>
          )}
          {dirtyFields.map((name) => (
            <Badge key={name}>{LABELS[name]} changed</Badge>
          ))}
        </div>
        <label className="row">
          <input
            type="checkbox"
            checked={warn}
            onChange={(event) => setWarn(event.target.checked)}
          />
          Ask before leaving the page while there are unsaved changes
        </label>
        <Callout>
          With the option on, make a change and reload the tab: the browser shows its own
          confirmation (the text cannot be customised). Client-side navigation is not covered —
          block it in your router.
        </Callout>
      </Panel>
    </div>
  );
}
