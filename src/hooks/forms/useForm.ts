import { useCallback, useId, useRef, useState, type ChangeEvent } from 'react';
import type { TextInputElement } from './useInput';
import { useFormDirtyState } from './useFormDirtyState';
import { useFormSubmission, type SubmissionStatus } from './useFormSubmission';
import {
  useFormValidation,
  validateSync,
  type FieldErrors,
  type FieldRules,
} from './useFormValidation';
import { useLatest } from '../state/useLatest';

/**
 * - `onBlur`: validate a field when it loses focus.
 * - `onChange`: validate on every change (and on blur).
 * - `onTouched` (default): first on blur, then on every change.
 * Every mode validates all fields on submit.
 */
export type FormMode = 'onBlur' | 'onChange' | 'onTouched';

/** Rules for one field. `deps` lists fields to re-validate when this one changes (if touched). */
export type FormFieldRules<T, V> = FieldRules<T, V> & { deps?: ReadonlyArray<keyof V> };

export type FormRules<V> = { [K in keyof V]?: FormFieldRules<V[K], V> };

/** Keys whose values can be bound to a native control by `register` (text-like or checkbox). */
export type RegisterableField<V> = {
  [K in keyof V]: V[K] extends string | boolean ? K : never;
}[keyof V] &
  string;

export type SubmitHandler<V> = (values: V, signal: AbortSignal) => unknown;

export interface UseFormOptions<V> {
  /** Captured on mount; change later with `reset(next)`. */
  initialValues: V;
  rules?: FormRules<V>;
  mode?: FormMode;
  /** Register a `beforeunload` confirmation while the form is dirty. Default `false`. */
  warnOnUnsavedChanges?: boolean;
  /** Move focus to the first invalid field (DOM order) when validation fails on submit. Default `true`. */
  focusFirstInvalid?: boolean;
  /** Prefix for generated field ids. Defaults to `useId()`. */
  id?: string;
}

/** Spread onto `<input>`, `<textarea>` or `<select>`: `<input {...register('email')} />`. */
export interface RegisteredFieldProps {
  id: string;
  name: string;
  /** Present for string fields. */
  value?: string;
  /** Present for boolean fields (checkboxes). */
  checked?: boolean;
  onChange: (event: ChangeEvent<TextInputElement>) => void;
  onBlur: () => void;
  ref: (element: HTMLElement | null) => (() => void) | undefined;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

export interface UseFormResult<V> {
  values: V;
  errors: FieldErrors<V>;
  touched: Partial<Record<keyof V, boolean>>;
  /** Fields with an async validation in flight. */
  validating: Partial<Record<keyof V, boolean>>;
  isValidating: boolean;
  /** No current errors and every synchronous rule passes for the current values. */
  isValid: boolean;
  isDirty: boolean;
  dirtyFields: Array<keyof V>;
  /** True while submit-time validation or `onSubmit` is running. */
  isSubmitting: boolean;
  submitStatus: SubmissionStatus;
  submitError: Error | undefined;
  submitCount: number;
  register: <K extends RegisterableField<V>>(name: K) => RegisteredFieldProps;
  /** Ids used by `register`, for labels (`htmlFor`) and error messages. */
  getFieldIds: (name: keyof V & string) => { id: string; errorId: string };
  setValue: <K extends keyof V>(name: K, value: V[K]) => void;
  setFieldError: (name: keyof V, message: string | undefined) => void;
  focusField: (name: keyof V) => void;
  /** Validate some (default: all) fields now, mark them touched; resolves `true` when valid. */
  validateFields: (
    names?: ReadonlyArray<keyof V>,
    options?: { focusFirstInvalid?: boolean },
  ) => Promise<boolean>;
  /**
   * Returns a submit handler: prevents the default, marks all fields touched,
   * runs every validator (sync + async), focuses the first invalid field or
   * calls `onSubmit(values, signal)`. Throwing from `onSubmit` sets
   * `submitStatus: 'error'` and `submitError`. Re-entrant calls are ignored.
   */
  handleSubmit: (
    onSubmit: SubmitHandler<V>,
  ) => (event?: { preventDefault: () => void }) => Promise<void>;
  /** Cancel the running submission (its signal aborts). */
  abortSubmit: () => void;
  /** Restore initial values (or adopt `nextInitialValues` as the new baseline) and clear all state. */
  reset: (nextInitialValues?: V) => void;
}

const EMPTY_RULES = {};

const sortByDomOrder = (a: HTMLElement, b: HTMLElement) =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

/**
 * A small, dependency-free form controller composed from the other hooks in
 * this category:
 *
 * - values + touched state, `register(name)` for native controls;
 * - validation via {@link useFormValidation} (sync + async, stale checks cancelled);
 * - dirty tracking via {@link useFormDirtyState} (optional unload warning);
 * - submission via {@link useFormSubmission} (status, error, no double submit,
 *   abort on unmount);
 * - accessibility: stable ids, `aria-invalid`, `aria-describedby` → error id,
 *   and focus moves to the first invalid field when submit fails.
 *
 * Controlled by design (every keystroke re-renders the form). That is fine
 * for typical forms; for very large forms prefer React Hook Form, which keeps
 * inputs uncontrolled.
 */
export function useForm<V extends object>(options: UseFormOptions<V>): UseFormResult<V> {
  const {
    rules = EMPTY_RULES as FormRules<V>,
    mode = 'onTouched',
    warnOnUnsavedChanges = false,
    focusFirstInvalid = true,
  } = options;
  const generatedId = useId();
  const baseId = options.id ?? generatedId;

  const [initialValues, setInitialValues] = useState(options.initialValues);
  const [values, setValues] = useState(options.initialValues);
  const [touched, setTouchedState] = useState<Partial<Record<keyof V, boolean>>>({});
  const [isSubmitValidating, setIsSubmitValidating] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  // Synchronous mirrors for event handlers: several updates can happen before
  // React re-renders (e.g. setValue followed by handleSubmit in one handler).
  const valuesRef = useRef(options.initialValues);
  const touchedRef = useRef<Partial<Record<keyof V, boolean>>>({});
  const elementsRef = useRef(new Map<keyof V, HTMLElement>());
  const submitLockRef = useRef(false);
  const rulesRef = useLatest(rules);
  const modeRef = useLatest(mode);

  const validation = useFormValidation<V>(rules);
  const { validateField, validateAll, setFieldError, clearErrors } = validation;
  const dirty = useFormDirtyState(values, initialValues, { warnOnUnload: warnOnUnsavedChanges });
  const submission = useFormSubmission<{ values: V; onSubmit: SubmitHandler<V> }, void>(
    async ({ values: submitted, onSubmit }, signal) => {
      await onSubmit(submitted, signal);
    },
  );

  const getFieldIds = useCallback(
    (name: keyof V & string) => ({ id: `${baseId}-${name}`, errorId: `${baseId}-${name}-error` }),
    [baseId],
  );

  const markTouched = useCallback((names: ReadonlyArray<keyof V>) => {
    const next = { ...touchedRef.current };
    for (const name of names) next[name] = true;
    touchedRef.current = next;
    setTouchedState(next);
  }, []);

  const focusFirst = useCallback((names: ReadonlyArray<keyof V>) => {
    const elements = names
      .map((name) => elementsRef.current.get(name))
      .filter((element): element is HTMLElement => element !== undefined && element.isConnected);
    elements.sort(sortByDomOrder)[0]?.focus();
  }, []);

  const setValue = useCallback(
    <K extends keyof V>(name: K, value: V[K]) => {
      const next = { ...valuesRef.current, [name]: value };
      valuesRef.current = next;
      setValues(next);
      const mode = modeRef.current;
      const fieldRules = rulesRef.current[name];
      const candidates: Array<keyof V> = [name, ...(fieldRules?.deps ?? [])];
      for (const candidate of candidates) {
        const isTouched = touchedRef.current[candidate] === true;
        const validateNow =
          mode === 'onChange'
            ? candidate === name || isTouched
            : isTouched && (mode === 'onTouched' || candidate !== name);
        if (validateNow) void validateField(candidate, next);
      }
    },
    [rulesRef, modeRef, validateField],
  );

  const register = useCallback(
    <K extends RegisterableField<V>>(name: K): RegisteredFieldProps => {
      const { id, errorId } = getFieldIds(name);
      const current: unknown = values[name];
      const error = validation.errors[name];
      return {
        id,
        name,
        ...(typeof current === 'boolean' ? { checked: current } : { value: String(current ?? '') }),
        onChange: (event) => {
          const target = event.target;
          const next =
            target instanceof HTMLInputElement && target.type === 'checkbox'
              ? target.checked
              : target.value;
          setValue(name, next as V[K]);
        },
        onBlur: () => {
          markTouched([name]);
          void validateField(name, valuesRef.current, { immediate: true });
        },
        ref: (element) => {
          if (!element) return undefined;
          const elements = elementsRef.current;
          elements.set(name, element);
          return () => {
            if (elements.get(name) === element) elements.delete(name);
          };
        },
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
      };
    },
    [getFieldIds, values, validation.errors, setValue, markTouched, validateField],
  );

  const focusField = useCallback((name: keyof V) => elementsRef.current.get(name)?.focus(), []);

  const validateFields = useCallback(
    async (names?: ReadonlyArray<keyof V>, opts: { focusFirstInvalid?: boolean } = {}) => {
      const targets = names ?? (Object.keys(valuesRef.current) as Array<keyof V>);
      markTouched(targets);
      const snapshot = valuesRef.current;
      const messages = await Promise.all(
        targets.map((name) => validateField(name, snapshot, { immediate: true })),
      );
      const invalid = targets.filter((_name, index) => messages[index]);
      if (invalid.length > 0 && (opts.focusFirstInvalid ?? focusFirstInvalid)) focusFirst(invalid);
      return invalid.length === 0;
    },
    [markTouched, validateField, focusFirst, focusFirstInvalid],
  );

  const { submit } = submission;
  const handleSubmit = useCallback(
    (onSubmit: SubmitHandler<V>) => async (event?: { preventDefault: () => void }) => {
      event?.preventDefault();
      if (submitLockRef.current) return;
      submitLockRef.current = true;
      setSubmitCount((count) => count + 1);
      markTouched(Object.keys(valuesRef.current) as Array<keyof V>);
      setIsSubmitValidating(true);
      try {
        const snapshot = valuesRef.current;
        const errors = await validateAll(snapshot);
        setIsSubmitValidating(false);
        const invalid = Object.keys(errors) as Array<keyof V>;
        if (invalid.length > 0) {
          if (focusFirstInvalid) focusFirst(invalid);
          return;
        }
        await submit({ values: snapshot, onSubmit });
      } finally {
        submitLockRef.current = false;
        setIsSubmitValidating(false);
      }
    },
    [markTouched, validateAll, focusFirstInvalid, focusFirst, submit],
  );

  const { reset: resetSubmission } = submission;
  const reset = useCallback(
    (nextInitialValues?: V) => {
      const base = nextInitialValues ?? initialValues;
      setInitialValues(base);
      valuesRef.current = base;
      setValues(base);
      touchedRef.current = {};
      setTouchedState({});
      clearErrors();
      resetSubmission();
      setSubmitCount(0);
    },
    [initialValues, clearErrors, resetSubmission],
  );

  const isValid =
    Object.keys(validation.errors).length === 0 &&
    Object.keys(validateSync(rules, values)).length === 0;

  return {
    values,
    errors: validation.errors,
    touched,
    validating: validation.validating,
    isValidating: validation.isValidating,
    isValid,
    isDirty: dirty.isDirty,
    dirtyFields: dirty.dirtyFields,
    isSubmitting: isSubmitValidating || submission.isSubmitting,
    submitStatus: submission.status,
    submitError: submission.error,
    submitCount,
    register,
    getFieldIds,
    setValue,
    setFieldError,
    focusField,
    validateFields,
    handleSubmit,
    abortSubmit: submission.abort,
    reset,
  };
}
