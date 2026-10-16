import { useState, type ChangeEvent } from 'react';

export enum EntryType {
  User = 'User',
  System = 'System',
}

/**
 * The original example's lightweight field hook (it predates the form
 * validation middleware). It can be controlled — `value` + `setValue` come
 * from a reducer — or uncontrolled, using internal state.
 *
 * Migration notes: `isDirty` is now set by user input and `validate()`
 * instead of an effect that watched `value`, removing an extra render, and the
 * hook is fully typed.
 */
const useFormField = (value?: string, setValue?: (value: string) => void) => {
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [entryType, setEntryType] = useState(EntryType.System);
  const [internalValue, internalSetValue] = useState(value ?? '');
  const currentValue = value ?? internalValue;
  const write = setValue ?? internalSetValue;

  const reset = () => {
    setIsDirty(false);
    setIsSubmitted(false);
  };

  const validate = () => {
    setIsDirty(true);
    setIsSubmitted(true);
  };

  const isEmpty = currentValue.length === 0;
  const isValid = !isDirty || !isEmpty;

  const setValueFromSystem = (next: string) => {
    setEntryType(EntryType.System);
    write(next);
  };

  const setValueFromUser = (next: string) => {
    setEntryType(EntryType.User);
    setIsDirty(true);
    write(next);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValueFromUser(event.target.value);
  };

  return {
    value: currentValue,
    setValue: write,
    reset,
    validate,
    isEmpty,
    isDirty,
    isSubmitted,
    isValid,
    onChange,
    setValueFromSystem,
    setValueFromUser,
    entryType,
    bind: {
      value: currentValue,
      onChange,
    },
  };
};

export default useFormField;
