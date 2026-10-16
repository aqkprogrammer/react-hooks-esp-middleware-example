import { useEventListener } from '../browser/useEventListener';

export interface UseFormDirtyStateOptions<V> {
  /**
   * Per-field equality. Defaults to {@link isStructurallyEqual} (primitives by
   * `Object.is`, arrays and plain objects by value) so `['a']` vs `['a']` is
   * not reported as a change.
   */
  isEqual?: (current: V[keyof V], initial: V[keyof V], name: keyof V) => boolean;
  /**
   * While dirty, ask the browser to confirm before the page is unloaded
   * (reload, close tab, navigate away). Default `false`. This does not cover
   * client-side route changes — block those in your router.
   */
  warnOnUnload?: boolean;
}

export interface UseFormDirtyStateResult<V> {
  isDirty: boolean;
  /** Changed fields, in key order. */
  dirtyFields: Array<keyof V>;
  isFieldDirty: (name: keyof V) => boolean;
}

/** Structural equality for form values: primitives, arrays and plain objects. */
export function isStructurallyEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isStructurallyEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && isStructurallyEqual(a[key], b[key]))
    );
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  // Legacy browsers only show the prompt when returnValue is set.
  event.returnValue = true;
}

/**
 * Compares current form values with their initial (or last saved) values and
 * reports whether — and which fields — changed. Optionally registers a
 * `beforeunload` guard while there are unsaved changes.
 *
 * Everything is derived during render: there is no state to keep in sync,
 * so "type, then undo the change" correctly returns to *not dirty*.
 * To mark the form clean after saving, pass the saved values as the new
 * `initialValues`.
 */
export function useFormDirtyState<V extends object>(
  values: V,
  initialValues: V,
  options: UseFormDirtyStateOptions<V> = {},
): UseFormDirtyStateResult<V> {
  const { isEqual = isStructurallyEqual, warnOnUnload = false } = options;

  const keys = new Set([...Object.keys(initialValues), ...Object.keys(values)]) as Set<keyof V>;
  const dirtyFields = [...keys].filter((name) => !isEqual(values[name], initialValues[name], name));
  const isDirty = dirtyFields.length > 0;

  useEventListener('beforeunload', onBeforeUnload, warnOnUnload && isDirty ? undefined : null);

  return {
    isDirty,
    dirtyFields,
    isFieldDirty: (name) => dirtyFields.includes(name),
  };
}
