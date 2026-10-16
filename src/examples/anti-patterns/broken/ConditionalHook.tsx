/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Violates the Rules of Hooks: Hooks called conditionally and after an early
 * return. eslint `react-hooks/rules-of-hooks` reports every marked line.
 * Corrected version: ../RulesOfHooksDemo.tsx
 */
import { useEffect, useState } from 'react';

export function ProfileForm({ userId }: { userId: string | null }) {
  // ❌ Early return before Hooks: the next render may call fewer Hooks.
  if (!userId) return <p>Please sign in.</p>;

  const [name, setName] = useState('');

  // ❌ Conditional Hook: when `name` becomes '' this effect's slot disappears
  // and every later Hook reads the wrong slot.
  if (name !== '') {
    useEffect(() => {
      localStorage.setItem('draft-name', name);
    });
  }

  const [surname, setSurname] = useState('');
  return (
    <form>
      <input value={name} onChange={(event) => setName(event.target.value)} />
      <input value={surname} onChange={(event) => setSurname(event.target.value)} />
    </form>
  );
}
