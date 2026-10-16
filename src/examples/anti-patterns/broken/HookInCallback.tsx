/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Violates the Rules of Hooks: Hooks called from an event handler, inside an
 * effect and inside useMemo, and from a regular (non-hook, non-component)
 * function. Corrected version: ../RulesOfHooksDemo.tsx
 */
import { useContext, useEffect, useMemo, useState, createContext } from 'react';

const ThemeContext = createContext('light');

// ❌ Not a component (lowercase) and not a hook (no `use` prefix).
function getTheme() {
  return useContext(ThemeContext);
}

export function SaveButton() {
  const theme = getTheme();

  useEffect(() => {
    // ❌ Hook inside an effect callback.
    const [ready] = useState(false);
    console.log(ready);
  }, []);

  const label = useMemo(() => {
    // ❌ Hook inside the useMemo callback.
    return useContext(ThemeContext) === 'dark' ? 'Save 🌙' : 'Save';
  }, []);

  return (
    <button
      className={theme}
      onClick={() => {
        // ❌ Hook inside an event handler.
        const [count, setCount] = useState(0);
        setCount(count + 1);
      }}
    >
      {label}
    </button>
  );
}
