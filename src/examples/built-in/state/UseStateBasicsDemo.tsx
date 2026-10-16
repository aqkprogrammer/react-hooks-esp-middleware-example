import { useState } from 'react';
import { Button, Callout, Panel, TextField, ValueTable, show } from '../../../components/ui';

/**
 * useState fundamentals: primitive and object state, functional updates
 * (batching) and lazy initialisation.
 */
export default function UseStateBasicsDemo() {
  const [draftKey, setDraftKey] = useState(0);
  return (
    <div className="stack">
      <Panel title="Primitive and object state">
        <PrimitiveAndObjectState />
      </Panel>
      <Panel
        title="Functional updates and batching"
        description="Each button calls the setter three times in the same click handler."
      >
        <BatchingCounter />
      </Panel>
      <Panel
        title="Lazy initialisation"
        description="The initialiser reads localStorage once, when the component mounts."
      >
        <DraftEditor key={draftKey} />
        <Button onClick={() => setDraftKey((key) => key + 1)}>Remount the editor</Button>
      </Panel>
    </div>
  );
}

interface Profile {
  name: string;
  age: number;
}

function PrimitiveAndObjectState() {
  const [likes, setLikes] = useState(0);
  const [profile, setProfile] = useState<Profile>({ name: 'Ada', age: 36 });
  return (
    <div className="stack">
      <div className="row">
        <Button onClick={() => setLikes(likes + 1)}>Like</Button>
        <span aria-live="polite">Likes: {likes}</span>
      </div>
      <div className="grid">
        <TextField
          label="Name"
          value={profile.name}
          // Replace the object: copy every field, then override the one that changed.
          onChange={(event) => setProfile({ ...profile, name: event.target.value })}
        />
        <TextField
          label="Age"
          type="number"
          min={0}
          value={profile.age}
          onChange={(event) => setProfile({ ...profile, age: Number(event.target.value) })}
        />
      </div>
      <ValueTable label="Profile state" rows={{ profile: show(profile) }} />
    </div>
  );
}

function BatchingCounter() {
  const [count, setCount] = useState(0);
  return (
    <div className="stack">
      <output className="mono" aria-label="Count">
        count = {count}
      </output>
      <div className="row">
        <Button
          onClick={() => {
            // `count` is the value from this render, so all three calls
            // schedule "set to count + 1": the result is +1.
            setCount(count + 1);
            setCount(count + 1);
            setCount(count + 1);
          }}
        >
          setCount(count + 1) ×3
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            // Updaters are queued and each receives the pending state: +3.
            setCount((c) => c + 1);
            setCount((c) => c + 1);
            setCount((c) => c + 1);
          }}
        >
          setCount(c =&gt; c + 1) ×3
        </Button>
        <Button variant="ghost" onClick={() => setCount(0)}>
          Reset
        </Button>
      </div>
      <p className="muted small">
        React batches every update in an event handler into a single re-render, so the screen
        updates once per click either way.
      </p>
    </div>
  );
}

const DRAFT_KEY = 'playground:use-state-draft';

function readDraft(): string {
  try {
    return window.localStorage.getItem(DRAFT_KEY) ?? '';
  } catch {
    return '';
  }
}

function DraftEditor() {
  // Lazy initialiser: `readDraft` runs on the first render only. Writing
  // `useState(readDraft())` would read storage on *every* render and discard it.
  const [draft, setDraft] = useState(readDraft);
  const [status, setStatus] = useState('Not saved yet');
  return (
    <div className="stack">
      <TextField
        label="Draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        hint="Save, edit, then remount: the editor starts from the saved draft."
      />
      <div className="row">
        <Button
          onClick={() => {
            try {
              window.localStorage.setItem(DRAFT_KEY, draft);
              setStatus(`Saved ${JSON.stringify(draft)}`);
            } catch {
              setStatus('Storage is unavailable');
            }
          }}
        >
          Save draft
        </Button>
        <span className="muted small" role="status">
          {status}
        </span>
      </div>
      <Callout title="Pass the function, not its result">
        <code>useState(readDraft)</code> or <code>useState(() =&gt; readDraft())</code>, never{' '}
        <code>useState(readDraft())</code>.
      </Callout>
    </div>
  );
}
