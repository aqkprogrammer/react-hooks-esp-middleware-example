import { useCallback, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { TextInputElement } from './useInput';
import { useFormValidation, type ValidationMessage } from './useFormValidation';

/**
 * When validation runs:
 * - `change`: on every change (and on blur) — immediate feedback, can nag
 *   while the user is still typing.
 * - `blur`: only when the field loses focus.
 * - `touched` (default): first on blur, then on every change — no errors
 *   while typing for the first time, but errors clear as soon as they are fixed.
 */
export type ValidateOn = 'change' | 'blur' | 'touched';

export interface UseFieldOptions {
  initialValue?: string;
  /** Pure synchronous validators, run in order; the first message wins. */
  validate?:
    ((value: string) => ValidationMessage) | ReadonlyArray<(value: string) => ValidationMessage>;
  /** Runs only when the sync validators pass. Stale runs are aborted and ignored. */
  validateAsync?: (value: string, signal: AbortSignal) => Promise<ValidationMessage>;
  /** Debounce for change-triggered async validation. Default `0`. */
  asyncDebounceMs?: number;
  validateOn?: ValidateOn;
  /** DOM id for the input. Defaults to a `useId()` value. */
  id?: string;
}

/** Props for the `<input>`/`<textarea>`, including the accessible error wiring. */
export interface FieldInputProps {
  id: string;
  value: string;
  onChange: (event: ChangeEvent<TextInputElement>) => void;
  onBlur: () => void;
  'aria-invalid': true | undefined;
  /** Points at `errorId` while there is an error. */
  'aria-describedby': string | undefined;
}

export interface UseFieldResult {
  value: string;
  /** Set the value programmatically. Validates if the current mode validates on change. */
  setValue: (value: string) => void;
  error: string | undefined;
  /** The field has been blurred at least once (or `validate()` was called). */
  touched: boolean;
  /** The value differs from the initial value. */
  dirty: boolean;
  isValidating: boolean;
  /** Validate now (async validators run without debounce); marks the field touched. */
  validate: () => Promise<string | undefined>;
  /** Back to the initial value, untouched, no error; cancels pending async checks. */
  reset: () => void;
  inputProps: FieldInputProps;
  /** Render the error message with this id so `aria-describedby` resolves. */
  errorId: string;
}

/**
 * One validated text field: value, touched, dirty, error and async-validation
 * state, plus accessible props (`id`, `aria-invalid`, `aria-describedby`).
 *
 * Built on {@link useFormValidation}, so it inherits stale-result protection
 * for async validators. Use it for standalone fields (a search box with
 * rules, an inline-edit field); use `useForm` when several fields share a
 * submit, cross-field rules or dirty tracking.
 */
export function useField(options: UseFieldOptions = {}): UseFieldResult {
  const { initialValue = '', validateOn = 'touched' } = options;
  const generatedId = useId();
  const id = options.id ?? generatedId;
  const errorId = `${id}-error`;

  const [initial] = useState(initialValue);
  const [value, setValueState] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  // Source of truth for callbacks: updated synchronously in handlers so two
  // changes before a re-render never validate a stale value.
  const valueRef = useRef(initialValue);

  const { validate, validateAsync, asyncDebounceMs } = options;
  const validation = useFormValidation<{ value: string }>({
    value: {
      validate:
        validate === undefined
          ? undefined
          : (typeof validate === 'function' ? [validate] : validate).map(
              (validator) => (fieldValue: string) => validator(fieldValue),
            ),
      validateAsync: validateAsync
        ? (fieldValue, _values, signal) => validateAsync(fieldValue, signal)
        : undefined,
      asyncDebounceMs,
    },
  });
  const { validateField, clearErrors } = validation;

  const shouldValidateOnChange = validateOn === 'change' || (validateOn === 'touched' && touched);

  const setValue = useCallback(
    (next: string) => {
      valueRef.current = next;
      setValueState(next);
      if (shouldValidateOnChange) void validateField('value', { value: next });
    },
    [shouldValidateOnChange, validateField],
  );

  const onChange = useCallback(
    (event: ChangeEvent<TextInputElement>) => setValue(event.target.value),
    [setValue],
  );

  const onBlur = useCallback(() => {
    setTouched(true);
    void validateField('value', { value: valueRef.current }, { immediate: true });
  }, [validateField]);

  const runValidation = useCallback(() => {
    setTouched(true);
    return validateField('value', { value: valueRef.current }, { immediate: true });
  }, [validateField]);

  const reset = useCallback(() => {
    valueRef.current = initial;
    setValueState(initial);
    setTouched(false);
    clearErrors();
  }, [initial, clearErrors]);

  const error = validation.errors.value;
  const inputProps = useMemo<FieldInputProps>(
    () => ({
      id,
      value,
      onChange,
      onBlur,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? errorId : undefined,
    }),
    [id, value, onChange, onBlur, error, errorId],
  );

  return {
    value,
    setValue,
    error,
    touched,
    dirty: value !== initial,
    isValidating: validation.isValidating,
    validate: runValidation,
    reset,
    inputProps,
    errorId,
  };
}
