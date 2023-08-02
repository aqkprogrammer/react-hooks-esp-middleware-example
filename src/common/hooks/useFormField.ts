import { useEffect, useState } from "react";

export enum EntryType {
  User = "User",
  System = "System"
}

/**
 * Not suggesting we replace the ui-fields stuff, just don't want
 * to re-create that here for the example, so using something like
 * this for now.
 *
 * TODO: Created this before the formValidationMiddleware stuff, revisit
 */
const useFormField = (value = "", setValue?: any) => {
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [entryType, setEntryType] = useState(EntryType.System);
  const [internalValue, internalSetValue] = useState(value);
  value = value ? value : internalValue;
  setValue = setValue ? setValue : internalSetValue;

  useEffect(() => {
    if (value.length) {
      setIsDirty(true);
    }
  }, [value]);

  const reset = () => {
    // setValue(initialValue);
    setIsDirty(false);
    setIsSubmitted(false);
  };

  const validate = () => {
    setIsDirty(true);
    setIsSubmitted(true);
  };

  const isEmpty = value.length === 0;

  const isValid = !isDirty || !isEmpty;

  const onChange = event => {
    event && event.preventDefault();
    setValueFromUser(event.target.value);
  };

  const setValueFromSystem = (value: string) => {
    setEntryType(EntryType.System);
    setValue(value);
  };

  const setValueFromUser = (value: string) => {
    setEntryType(EntryType.User);
    setValue(value);
  };

  return {
    value,
    setValue,
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
      value,
      onChange
    }
  };
};

export default useFormField;
