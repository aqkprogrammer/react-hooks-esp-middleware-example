/**
 * Internal: ordered stacks of active overlay "layers" shared by
 * `useFocusTrap` and `useEscapeKey`, so that with nested overlays (a popover
 * inside a drawer) only the most recently activated one reacts.
 *
 * Layers are ordered by activation time. Effects of a child run before its
 * parent's, so if a parent and child activate in the *same* commit the child
 * ends up below its parent — activate nested layers in response to user
 * interaction (the normal case) to get the expected order.
 */
export type LayerKind = 'focus-trap' | 'escape';

const stacks: Record<LayerKind, symbol[]> = { 'focus-trap': [], escape: [] };

export function pushLayer(kind: LayerKind): symbol {
  const token = Symbol(kind);
  stacks[kind].push(token);
  return token;
}

export function removeLayer(kind: LayerKind, token: symbol): void {
  const stack = stacks[kind];
  const index = stack.indexOf(token);
  if (index !== -1) stack.splice(index, 1);
}

export function isTopLayer(kind: LayerKind, token: symbol | null): boolean {
  const stack = stacks[kind];
  return token !== null && stack[stack.length - 1] === token;
}
