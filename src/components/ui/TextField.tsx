import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Visually hide the label (it stays available to assistive technology). */
  hideLabel?: boolean;
}

/** Labelled input wired up with `useId` for `htmlFor`, hints and error messages. */
export function TextField({
  label,
  hint,
  error,
  hideLabel,
  className,
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ');
  return (
    <div className={['field', className ?? ''].join(' ').trim()}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : 'field-label'}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
