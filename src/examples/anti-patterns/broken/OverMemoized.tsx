/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Anti-pattern: memoising everything by reflex. None of these memos skip any
 * real work: the values are cheap, the children are not memo(), and the
 * DOM `<button>` does not care about callback identity. The result is more
 * code, more dependency arrays to get wrong, and slightly *more* work per
 * render. Corrected version: ../OverMemoizedFixed.tsx
 */
import { useCallback, useMemo, useState } from 'react';

export function Counter({ step }: { step: number }) {
  const [count, setCount] = useState(0);

  // ❌ Memoising a cheap arithmetic expression.
  const doubled = useMemo(() => count * 2, [count]);
  // ❌ Memoising a string template.
  const label = useMemo(() => `Count: ${count}`, [count]);
  // ❌ useCallback for a handler passed to a DOM element.
  const increment = useCallback(() => setCount((value) => value + step), [step]);
  // ❌ Memoising a style object passed to a DOM element.
  const style = useMemo(() => ({ fontWeight: 600 }), []);

  return (
    <div>
      <p style={style}>
        {label} (doubled: {doubled})
      </p>
      <button onClick={increment}>+{step}</button>
    </div>
  );
}
