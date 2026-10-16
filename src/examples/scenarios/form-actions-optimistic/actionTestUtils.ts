import { vi } from 'vitest';

/**
 * Test-only helpers for observing Action intermediate states (optimistic
 * items, pending buttons). An awaited `act()` would wait for the whole
 * action, and a synchronous one drops the pending render, so these tests let
 * React schedule work as in a browser and drive the DOM natively.
 */
export interface Gate {
  promise: Promise<void>;
  open: () => void;
}

/** A promise the test resolves by hand, to hold an MSW response open. */
export function createGate(): Gate {
  let open = () => {};
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

/** Stop treating this test as an act() environment (restored by `unstubGlobals`). */
export function leaveActEnvironment(): void {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', false);
}

/** Set an input's value like typing does, then fire the `input` event React listens to. */
export function typeNatively(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
