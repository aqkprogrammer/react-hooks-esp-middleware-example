import { vi } from 'vitest';

/**
 * Helpers for the Modern React demo tests: a manually resolved "gate" lets a
 * test hold an MSW response open, assert the pending UI, then release it.
 */
export interface Gate {
  promise: Promise<void>;
  open: () => void;
}

export function createGate(): Gate {
  let open = () => {};
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

/**
 * Lets React schedule work the way it does in a browser instead of inside
 * `act()`. Needed to observe intermediate states (Suspense fallbacks,
 * `isPending`, optimistic values): a synchronous `act()` drops renders that
 * suspend on a pending promise, and an awaited `act()` waits for the promise,
 * so neither can show "loading". After calling this, interact with native DOM
 * events (`element.click()`, the helpers below) and assert with `findBy*` /
 * `waitFor`, not with user-event (which wraps every event in `act()`).
 * `vi.stubGlobal` is restored after each test (`unstubGlobals: true`).
 */
export function leaveActEnvironment(): void {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', false);
}

/** Sets an input's value like a user typing it, then fires the `input` event React listens to. */
export function typeNatively(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
