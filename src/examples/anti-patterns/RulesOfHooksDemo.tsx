import { createContext, useContext, useEffect, useState } from 'react';
import { Button, Callout, Panel, TextField } from '../../components/ui';

const ThemeContext = createContext<'light' | 'dark'>('light');

/**
 * The corrected versions of broken/ConditionalHook.tsx, broken/HookInLoop.tsx
 * and broken/HookInCallback.tsx. Every Hook is called unconditionally at the
 * top level; conditions live *inside* Hooks, per-item state lives in a
 * per-item component, and values read by Hooks are used inside callbacks.
 */
export default function RulesOfHooksDemo() {
  const [signedIn, setSignedIn] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <ThemeContext value={theme}>
      <div className="stack">
        <Panel
          title="1 · Condition inside the Hook, early return in the parent"
          description="Typing a name updates document.title from an effect; clearing it restores the title."
        >
          <Button onClick={() => setSignedIn((value) => !value)}>
            {signedIn ? 'Sign out' : 'Sign in'}
          </Button>
          {/* The "early return" moved up: ProfileForm always calls all of its Hooks. */}
          {signedIn ? <ProfileForm /> : <p>Please sign in.</p>}
        </Panel>
        <Panel
          title="2 · One component per item instead of Hooks in a loop"
          description="Write a note, then reverse the list: each note stays with its person."
        >
          <PeopleNotes />
        </Panel>
        <Panel title="3 · Read at the top level, use inside callbacks">
          <Button onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}>
            Toggle theme context ({theme})
          </Button>
          <SaveButton />
        </Panel>
        <Callout title="The rule in one sentence">
          Call Hooks only at the top level of a function component or a custom Hook — never inside
          conditions, loops, nested functions, try/catch, or after an early return.
        </Callout>
      </div>
    </ThemeContext>
  );
}

function ProfileForm() {
  const [name, setName] = useState('');
  useEffect(() => {
    if (name === '') return; // ✅ the condition lives inside the effect
    const previous = document.title;
    document.title = `Editing ${name}`;
    return () => {
      document.title = previous;
    };
  }, [name]);
  const [surname, setSurname] = useState('');

  return (
    <div className="row">
      <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField
        label="Surname"
        value={surname}
        onChange={(event) => setSurname(event.target.value)}
      />
    </div>
  );
}

function PeopleNotes() {
  const [reversed, setReversed] = useState(false);
  const people = reversed ? ['Poppins', 'Mary'] : ['Mary', 'Poppins'];
  return (
    <div className="stack">
      <Button onClick={() => setReversed((value) => !value)}>Reverse list</Button>
      <ul className="list" aria-label="People">
        {people.map((person) => (
          <NoteRow key={person} person={person} />
        ))}
      </ul>
    </div>
  );
}

/** ✅ Each row calls useState at its own top level; React matches rows by key. */
function NoteRow({ person }: { person: string }) {
  const [note, setNote] = useState('');
  return (
    <li className="row">
      <TextField
        label={`Note for ${person}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
    </li>
  );
}

function SaveButton() {
  // ✅ Hooks at the top level; the handler only *uses* their results.
  const theme = useContext(ThemeContext);
  const [saves, setSaves] = useState(0);
  return (
    <Button variant="primary" onClick={() => setSaves((count) => count + 1)}>
      Save with {theme} theme ({saves})
    </Button>
  );
}
