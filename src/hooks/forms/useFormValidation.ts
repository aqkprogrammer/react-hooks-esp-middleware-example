import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError, toError } from '../internal/env';
import { useLatest } from '../state/useLatest';

/** A validator returns an error message, or nothing when the value is valid. */
export type ValidationMessage = string | null | undefined;

/** Synchronous validator. Receives the field value and every form value (for cross-field rules). */
export type SyncValidator<T, V> = (value: T, values: V) => ValidationMessage;

/**
 * Asynchronous validator (e.g. "is this username available?"). Pass `signal`
 * to `fetch` so superseded checks are cancelled on the network too.
 */
export type AsyncValidator<T, V> = (
  value: T,
  values: V,
  signal: AbortSignal,
) => Promise<ValidationMessage>;

export interface FieldRules<T, V> {
  /** Run in order; the first message wins. Pure functions only. */
  validate?: SyncValidator<T, V> | ReadonlyArray<SyncValidator<T, V>>;
  /** Runs only when every synchronous validator passes. */
  validateAsync?: AsyncValidator<T, V>;
  /**
   * Wait this long before starting `validateAsync`, so typing quickly only
   * sends one request. Ignored for `{ immediate: true }` runs (e.g. on submit).
   * Default `0`.
   */
  asyncDebounceMs?: number;
}

/** Validation rules keyed by field name. */
export type ValidationRules<V> = { [K in keyof V]?: FieldRules<V[K], V> };

/** Current error message per field; valid fields are absent. */
export type FieldErrors<V> = Partial<Record<keyof V, string>>;

export interface ValidateFieldOptions {
  /** Skip `asyncDebounceMs` (use on blur/submit). */
  immediate?: boolean;
  /** Only run the synchronous validators (any pending async check is cancelled). */
  skipAsync?: boolean;
}

export interface UseFormValidationResult<V> {
  errors: FieldErrors<V>;
  /** Fields whose async validator is currently running. */
  validating: Partial<Record<keyof V, boolean>>;
  isValidating: boolean;
  /**
   * Validates one field against `values` and stores the result. If a newer
   * validation of the same field starts before this one finishes, the older
   * one is aborted, its result is ignored, and the returned promise resolves
   * with the newer run's result instead.
   */
  validateField: <K extends keyof V>(
    name: K,
    values: V,
    options?: ValidateFieldOptions,
  ) => Promise<string | undefined>;
  /** Validates every field that has rules (async validators run immediately, in parallel). */
  validateAll: (values: V) => Promise<FieldErrors<V>>;
  /** Set or clear (`undefined`) an error by hand, e.g. from a server response. */
  setFieldError: (name: keyof V, message: string | undefined) => void;
  /** Clears errors (all, or the given fields) and cancels their pending async checks. */
  clearErrors: (names?: ReadonlyArray<keyof V>) => void;
}

/** Runs synchronous validators in order and returns the first message. Pure. */
export function runSyncValidators<T, V>(
  validate: FieldRules<T, V>['validate'],
  value: T,
  values: V,
): string | undefined {
  if (!validate) return undefined;
  const list: ReadonlyArray<SyncValidator<T, V>> =
    typeof validate === 'function' ? [validate] : validate;
  for (const validator of list) {
    const message = validator(value, values);
    if (message) return message;
  }
  return undefined;
}

/** Runs every synchronous rule against `values`. Pure — safe to call during render. */
export function validateSync<V extends object>(
  rules: ValidationRules<V>,
  values: V,
): FieldErrors<V> {
  const errors: FieldErrors<V> = {};
  for (const name of Object.keys(rules) as Array<keyof V>) {
    const message = runSyncValidators(rules[name]?.validate, values[name], values);
    if (message) errors[name] = message;
  }
  return errors;
}

function waitFor(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Validation superseded', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

interface FieldRun {
  controller?: AbortController;
  promise?: Promise<string | undefined>;
}

function withField<V, T>(
  record: Partial<Record<keyof V, T>>,
  name: keyof V,
  value: T | undefined,
): Partial<Record<keyof V, T>> {
  if (record[name] === value) return record;
  const next = { ...record };
  if (value === undefined) delete next[name];
  else next[name] = value;
  return next;
}

/**
 * A headless validation runner: per-field sync + async validators, an errors
 * map and cancellation of stale async checks. It stores no values — pass the
 * current values to `validateField`/`validateAll` — so it composes with any
 * state shape (`useForm` uses it internally).
 *
 * Race handling: each field has at most one live async validation. Starting a
 * new one aborts the previous `AbortSignal` and the older result is discarded,
 * so a slow "username taken" response can never overwrite a newer "available".
 * Pending checks are aborted on unmount.
 *
 * If an async validator throws (not an abort), the error's message becomes the
 * field error so failures are never silently treated as "valid". Return a
 * friendlier message from the validator if you prefer.
 */
export function useFormValidation<V extends object>(
  rules: ValidationRules<V>,
): UseFormValidationResult<V> {
  const rulesRef = useLatest(rules);
  const [errors, setErrors] = useState<FieldErrors<V>>({});
  const [validating, setValidating] = useState<Partial<Record<keyof V, boolean>>>({});
  const runsRef = useRef(new Map<keyof V, FieldRun>());
  const mountedRef = useRef(false);

  useEffect(() => {
    const runs = runsRef.current;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runs.forEach((run) => run.controller?.abort());
      runs.clear();
    };
  }, []);

  const setFieldError = useCallback((name: keyof V, message: string | undefined) => {
    setErrors((previous) => withField(previous, name, message));
  }, []);

  const setFieldValidating = useCallback((name: keyof V, active: boolean) => {
    setValidating((previous) => withField(previous, name, active ? true : undefined));
  }, []);

  const validateField = useCallback(
    <K extends keyof V>(
      name: K,
      values: V,
      options: ValidateFieldOptions = {},
    ): Promise<string | undefined> => {
      const runs = runsRef.current;
      runs.get(name)?.controller?.abort();
      const run: FieldRun = {};
      runs.set(name, run);
      const isCurrent = () => mountedRef.current && runs.get(name) === run;
      const superseded = (): Promise<string | undefined> | undefined => {
        const latest = runs.get(name);
        return mountedRef.current && latest && latest !== run ? latest.promise : undefined;
      };

      const rule = rulesRef.current[name];
      const value = values[name];

      run.promise = (async () => {
        const syncMessage = runSyncValidators(rule?.validate, value, values);
        if (syncMessage || !rule?.validateAsync || options.skipAsync) {
          setFieldValidating(name, false);
          setFieldError(name, syncMessage);
          return syncMessage;
        }
        const controller = new AbortController();
        run.controller = controller;
        setFieldError(name, undefined);
        setFieldValidating(name, true);
        try {
          const wait = options.immediate ? 0 : (rule.asyncDebounceMs ?? 0);
          if (wait > 0) await waitFor(wait, controller.signal);
          const message = (await rule.validateAsync(value, values, controller.signal)) || undefined;
          // Settled: a later run must not abort a signal whose work is done.
          run.controller = undefined;
          if (!isCurrent()) return superseded();
          setFieldValidating(name, false);
          setFieldError(name, message);
          return message;
        } catch (error) {
          run.controller = undefined;
          if (!isCurrent()) return superseded();
          setFieldValidating(name, false);
          if (isAbortError(error)) return undefined;
          const message = toError(error).message;
          setFieldError(name, message);
          return message;
        }
      })();
      return run.promise;
    },
    [rulesRef, setFieldError, setFieldValidating],
  );

  const validateAll = useCallback(
    async (values: V): Promise<FieldErrors<V>> => {
      const names = Object.keys(rulesRef.current) as Array<keyof V>;
      const messages = await Promise.all(
        names.map((name) => validateField(name, values, { immediate: true })),
      );
      const result: FieldErrors<V> = {};
      names.forEach((name, index) => {
        const message = messages[index];
        if (message) result[name] = message;
      });
      return result;
    },
    [rulesRef, validateField],
  );

  const clearErrors = useCallback((names?: ReadonlyArray<keyof V>) => {
    const runs = runsRef.current;
    const targets = names ?? [...runs.keys()];
    for (const name of targets) {
      runs.get(name)?.controller?.abort();
      runs.delete(name);
    }
    if (!names) {
      setErrors({});
      setValidating({});
      return;
    }
    setErrors((previous) => names.reduce((acc, name) => withField(acc, name, undefined), previous));
    setValidating((previous) =>
      names.reduce((acc, name) => withField(acc, name, undefined), previous),
    );
  }, []);

  const isValidating = Object.values(validating).some(Boolean);

  return {
    errors,
    validating,
    isValidating,
    validateField,
    validateAll,
    setFieldError,
    clearErrors,
  };
}
