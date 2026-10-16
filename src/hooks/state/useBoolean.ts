import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

export interface UseBooleanReturn {
  value: boolean;
  /** The raw `useState` setter (accepts a value or an updater). */
  setValue: Dispatch<SetStateAction<boolean>>;
  setTrue: () => void;
  setFalse: () => void;
  toggle: () => void;
}

/**
 * Boolean state with named, **stable** actions — `setTrue`, `setFalse` and
 * `toggle` keep the same identity for the component's lifetime, so they can
 * be passed to memoized children or used in dependency arrays.
 *
 * The actions ignore their arguments, so `onClick={toggle}` is safe (the
 * click event is not mistaken for a new value).
 *
 * Setting the value it already has bails out of the re-render (`Object.is`).
 */
export function useBoolean(initialValue: boolean | (() => boolean) = false): UseBooleanReturn {
  const [value, setValue] = useState(initialValue);
  const actions = useMemo(
    () => ({
      setTrue: () => setValue(true),
      setFalse: () => setValue(false),
      toggle: () => setValue((previous) => !previous),
    }),
    [],
  );
  return { value, setValue, ...actions };
}
