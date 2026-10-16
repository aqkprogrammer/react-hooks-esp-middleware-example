import { useState } from 'react';
import { useEventListener } from '../../../hooks/browser/useEventListener';

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export interface UseKeyPressOptions {
  /** Ignore the key while focus is in a text field (default `false`). */
  ignoreWhenEditing?: boolean;
}

/**
 * Calls `action` when `targetKey` is pressed anywhere in the window and
 * reports whether it is currently held down.
 *
 * Now built on the library's `useEventListener`, so the latest `action` is
 * always used without re-subscribing (the original memoised handlers with
 * `useCallback` and re-subscribed whenever `action` changed).
 */
const useKeyPress = (targetKey: string, action: () => void, options: UseKeyPressOptions = {}) => {
  const [keyPressed, setKeyPressed] = useState(false);

  useEventListener('keydown', (event) => {
    if (event.key !== targetKey) return;
    if (options.ignoreWhenEditing && isEditable(event.target)) return;
    setKeyPressed(true);
    action();
  });

  useEventListener('keyup', (event) => {
    if (event.key === targetKey) setKeyPressed(false);
  });

  return [keyPressed, targetKey] as const;
};

export default useKeyPress;
