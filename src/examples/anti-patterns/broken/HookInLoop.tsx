/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Violates the Rules of Hooks: a Hook called inside a loop / `.map`. When the
 * list is reordered, filtered or grows, the calls shift slots and items
 * silently swap state. Corrected version: ../RulesOfHooksDemo.tsx (one
 * component per item, each calling its own Hook).
 */
import { useState } from 'react';

export function TodoNotes({ todos }: { todos: { id: string; title: string }[] }) {
  // ❌ One useState per item, called in a loop.
  const notes = todos.map((todo) => useState(`Notes for ${todo.title}`));

  return (
    <ul>
      {todos.map((todo, index) => {
        const [note, setNote] = notes[index]!;
        return (
          <li key={todo.id}>
            {todo.title}
            <input value={note} onChange={(event) => setNote(event.target.value)} />
          </li>
        );
      })}
    </ul>
  );
}
