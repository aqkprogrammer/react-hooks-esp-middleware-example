/**
 * Type helpers shared by the concrete middleware.
 *
 * The core `Middleware<S, A>` contract is generic over *any* action type, so a
 * store may dispatch plain objects and (with the thunk middleware) functions.
 * Middleware that dispatch on `action.type` use these helpers to stay type-safe
 * without assuming every action is an object.
 */

/** An action with a string discriminant. */
export interface TypedAction {
  type: string;
}

/** The `type` strings of every object action in the union `A`. */
export type ActionTypeOf<A> = Extract<A, TypedAction>['type'];

/** The member of the union `A` whose `type` is `T`. */
export type ActionOfType<A, T extends string> = Extract<A, { type: T }>;

/**
 * A handler map keyed by action type: each handler receives the *narrowed*
 * action, e.g. `{ ADD_ITEM: (action, state) => action.payload.name }`.
 */
export type HandlersByType<A, Args extends unknown[], Result> = {
  [T in ActionTypeOf<A>]?: (action: ActionOfType<A, T>, ...args: Args) => Result;
};

/** Returns `action.type` when the action is an object with a string `type`. */
export function getActionType(action: unknown): string | undefined {
  if (typeof action !== 'object' || action === null) return undefined;
  const type: unknown = (action as { type?: unknown }).type;
  return typeof type === 'string' ? type : undefined;
}

/**
 * Looks up the handler for `action` in a map keyed by action type.
 *
 * The cast is the one place the per-type narrowing is erased: `map[type]` is
 * only ever called with an action whose `type` equals the key, which is the
 * invariant `HandlersByType` encodes.
 */
export function findHandler<A, Args extends unknown[], Result>(
  map: HandlersByType<A, Args, Result>,
  action: A,
): ((action: A, ...args: Args) => Result) | undefined {
  const type = getActionType(action);
  if (type === undefined || !Object.hasOwn(map, type)) return undefined;
  const handler: unknown = (map as Record<string, unknown>)[type];
  return typeof handler === 'function'
    ? (handler as (action: A, ...args: Args) => Result)
    : undefined;
}
