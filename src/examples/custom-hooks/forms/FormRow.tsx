import type { InputHTMLAttributes, ReactNode } from 'react';
import type { RegisteredFieldProps } from '../../../hooks';

export interface FormRowProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  keyof RegisteredFieldProps
> {
  label: ReactNode;
  /** The result of `form.register(name)`. */
  field: RegisteredFieldProps;
  error?: string;
  hint?: ReactNode;
  /** Extra status text, e.g. "Checking…" while an async validator runs. */
  status?: ReactNode;
}

/**
 * Demo helper: a labelled input bound with `register()`. Merges the hook's
 * `aria-describedby` (error) with the hint, so both are announced.
 */
export function FormRow({ label, field, error, hint, status, ...inputProps }: FormRowProps) {
  const hintId = `${field.id}-hint`;
  const describedBy = [hint ? hintId : '', field['aria-describedby'] ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className="field">
      <label htmlFor={field.id} className="field-label">
        {label}
      </label>
      <input
        className="input"
        {...inputProps}
        {...field}
        aria-describedby={describedBy || undefined}
      />
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {status ? <p className="field-hint">{status}</p> : null}
      {error ? (
        <p id={`${field.id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
