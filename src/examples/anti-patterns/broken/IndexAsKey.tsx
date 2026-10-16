/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Anti-pattern: array index as `key` for items that have state (an input,
 * a checkbox, a component with useState). Inserting at the top or removing
 * an item shifts indices, so React reuses the wrong component instance and
 * the typed text "jumps" to another row. Lint does not catch this.
 * Corrected version: ../ListKeysDemo.tsx
 */
import { useState } from 'react';

export function GuestList() {
  const [guests, setGuests] = useState(['Ada', 'Grace']);
  return (
    <div>
      <button onClick={() => setGuests((current) => [`Guest ${current.length + 1}`, ...current])}>
        Add to top
      </button>
      <ul>
        {guests.map((guest, index) => (
          // ❌ index as key: the uncontrolled input keeps its text, but the label moves.
          <li key={index}>
            {guest} <input placeholder="Dietary notes" />
          </li>
        ))}
      </ul>
    </div>
  );
}
