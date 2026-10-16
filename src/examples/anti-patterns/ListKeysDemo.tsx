import { useState } from 'react';
import { Button, Callout, Panel } from '../../components/ui';

interface Guest {
  id: number;
  name: string;
}

type KeyStrategy = 'id' | 'index';

/**
 * Corrected version of broken/IndexAsKey.tsx, with the buggy key strategy
 * still selectable so the difference is visible. Each row has an
 * uncontrolled input (DOM state). With `key={index}`, inserting at the top
 * makes React reuse the first row's DOM for the new guest, so the notes
 * appear next to the wrong name.
 */
export default function ListKeysDemo() {
  const [guests, setGuests] = useState<Guest[]>([
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
  ]);
  const [strategy, setStrategy] = useState<KeyStrategy>('id');

  return (
    <div className="stack">
      <Panel title="Guest list" description="Type a note for Ada, then add a guest to the top.">
        <fieldset className="row ap-fieldset">
          <legend className="small">Key each row by</legend>
          <label className="row small">
            <input
              type="radio"
              name="key-strategy"
              checked={strategy === 'id'}
              onChange={() => setStrategy('id')}
            />
            stable id (correct)
          </label>
          <label className="row small">
            <input
              type="radio"
              name="key-strategy"
              checked={strategy === 'index'}
              onChange={() => setStrategy('index')}
            />
            array index (bug)
          </label>
        </fieldset>
        <div className="row">
          <Button
            onClick={() =>
              setGuests((current) => {
                const id = Math.max(0, ...current.map((guest) => guest.id)) + 1;
                return [{ id, name: `Guest ${id}` }, ...current];
              })
            }
          >
            Add guest to top
          </Button>
          <Button
            variant="ghost"
            onClick={() => setGuests((current) => current.slice(1))}
            disabled={guests.length === 0}
          >
            Remove first guest
          </Button>
        </div>
        <ul className="list" aria-label="Guests">
          {guests.map((guest, index) => (
            <li key={strategy === 'id' ? guest.id : index} className="row">
              <span>{guest.name}</span>
              <input
                className="input"
                aria-label={`Notes for ${guest.name}`}
                placeholder="Dietary notes"
              />
            </li>
          ))}
        </ul>
      </Panel>
      <Callout title="When is the index fine?">
        Only for static lists that never reorder, insert or delete, and whose items hold no state
        (no inputs, no stateful children). Otherwise use an id from the data — not{' '}
        <code>Math.random()</code>, which remounts every row on every render.
      </Callout>
    </div>
  );
}
