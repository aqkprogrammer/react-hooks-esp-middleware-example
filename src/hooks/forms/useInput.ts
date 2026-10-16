import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { useLatest } from '../state/useLatest';

/** Elements whose `value` is a string and which emit `change` events. */
export type TextInputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface UseInputOptions {
  /**
   * Applied to every value coming from `onChange` (not to `setValue`), e.g.
   * `(raw) => raw.toUpperCase()` or `(raw) => raw.replace(/\D/g, '')`.
   * Keep it pure; it runs inside the event handler. May change between renders.
   */
  transform?: (raw: string) => string;
}

/** Props to spread onto an `<input>`, `<textarea>` or `<select>`. */
export interface InputBindProps {
  value: string;
  onChange: (event: ChangeEvent<TextInputElement>) => void;
}

export interface UseInputResult {
  value: string;
  /** Set the value programmatically (bypasses `transform`). */
  setValue: (value: string) => void;
  onChange: (event: ChangeEvent<TextInputElement>) => void;
  /** Restore the initial value captured on mount. */
  reset: () => void;
  /** `{ value, onChange }` — spread onto the element: `<input {...bind} />`. */
  bind: InputBindProps;
}

/**
 * The smallest useful form primitive: one controlled text value with a
 * change handler, an optional input `transform` and `reset()`.
 *
 * It deliberately does *not* track validation, touched or dirty state —
 * use {@link useField} for a validated field and `useForm` for a whole form.
 *
 * `onChange`, `setValue` and `reset` are referentially stable; `bind` only
 * changes when the value does, so it can be passed to memoised inputs.
 */
export function useInput(initialValue = '', options: UseInputOptions = {}): UseInputResult {
  const [initial] = useState(initialValue);
  const [value, setValue] = useState(initialValue);
  const transformRef = useLatest(options.transform);

  const onChange = useCallback(
    (event: ChangeEvent<TextInputElement>) => {
      const raw = event.target.value;
      const transform = transformRef.current;
      setValue(transform ? transform(raw) : raw);
    },
    [transformRef],
  );
  const reset = useCallback(() => setValue(initial), [initial]);
  const bind = useMemo(() => ({ value, onChange }), [value, onChange]);

  return { value, setValue, onChange, reset, bind };
}
