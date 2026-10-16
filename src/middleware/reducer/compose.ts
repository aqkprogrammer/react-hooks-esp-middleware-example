import type { Dispatch, Middleware, MiddlewareAPI } from './types';

/**
 * Builds the dispatch chain. The first middleware in the array sees actions
 * first (outermost), the reducer sees them last:
 *
 *   applyMiddleware([a, b, c], api, reduce) → a(b(c(reduce)))
 */
export function applyMiddleware<S, A>(
  middleware: ReadonlyArray<Middleware<S, A>>,
  api: MiddlewareAPI<S, A>,
  reduce: Dispatch<A>,
): Dispatch<A> {
  return middleware
    .map((factory) => factory(api))
    .reduceRight<Dispatch<A>>((next, wrap) => wrap(next), reduce);
}
