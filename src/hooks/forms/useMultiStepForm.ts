import { useCallback, useRef, useState } from 'react';
import { useLatest } from '../state/useLatest';

export interface FormStep<Id extends string = string> {
  id: Id;
  title: string;
  /**
   * Runs before moving *forward* from this step. Return (or resolve) `false`
   * to stay — e.g. `() => form.validateFields(['email', 'password'])`.
   * Going back never validates, so users can always review earlier steps.
   */
  validate?: () => boolean | Promise<boolean>;
}

export interface UseMultiStepFormOptions<Id extends string> {
  /** At least one step. May change between renders (e.g. conditional steps). */
  steps: ReadonlyArray<FormStep<Id>>;
  /** Default `0`. */
  initialStep?: number;
}

export interface UseMultiStepFormResult<Id extends string> {
  steps: ReadonlyArray<FormStep<Id>>;
  currentIndex: number;
  currentStep: FormStep<Id>;
  stepCount: number;
  isFirst: boolean;
  isLast: boolean;
  /** `(currentIndex + 1) / stepCount`, between 0 and 1 — feed it to `<progress>`. */
  progress: number;
  /** Highest step index reached so far; steps up to it can be revisited with `goTo`. */
  furthestIndex: number;
  /** A step's `validate` is running. */
  isValidating: boolean;
  /**
   * Validate the current step, then advance. Resolves `true` when it moved
   * (or, on the last step, when the step is valid — submit from there).
   */
  next: () => Promise<boolean>;
  /** Go to the previous step (no validation). */
  back: () => void;
  /**
   * Go to any step already reached. Moving forward validates the current
   * step first; moving back does not.
   */
  goTo: (index: number) => Promise<boolean>;
  canGoTo: (index: number) => boolean;
  /** Back to the first step and forget progress. */
  reset: () => void;
}

interface Position {
  index: number;
  furthest: number;
}

/**
 * Navigation state for a wizard: current step, progress, next/back with
 * per-step validation and jumping back to any visited step.
 *
 * It owns only *where* the user is — keep the form values in one place
 * (e.g. a single `useForm` for all steps) so going back never loses input
 * and the final submit can validate everything. Concurrent `next()` calls
 * while a step validates are ignored.
 */
export function useMultiStepForm<Id extends string>(
  options: UseMultiStepFormOptions<Id>,
): UseMultiStepFormResult<Id> {
  const { steps, initialStep = 0 } = options;
  if (steps.length === 0) throw new Error('useMultiStepForm needs at least one step');
  const lastIndex = steps.length - 1;

  const [initialPosition] = useState<Position>(() => {
    const start = Math.max(0, Math.min(lastIndex, initialStep));
    return { index: start, furthest: start };
  });
  const [position, setPositionState] = useState<Position>(initialPosition);
  const [isValidating, setIsValidating] = useState(false);
  const busyRef = useRef(false);
  const stepsRef = useLatest(steps);
  // Synchronous mirror of `position`, so two navigations in one event handler
  // (before React re-renders) build on each other.
  const positionRef = useRef(initialPosition);
  const setPosition = useCallback((update: (previous: Position) => Position) => {
    positionRef.current = update(positionRef.current);
    setPositionState(positionRef.current);
  }, []);

  // Derived, so removing steps never leaves the index out of range.
  const currentIndex = Math.min(position.index, lastIndex);
  const furthestIndex = Math.min(position.furthest, lastIndex);
  const currentStep = steps[currentIndex] as FormStep<Id>;

  const validateCurrent = useCallback(async (): Promise<boolean> => {
    const list = stepsRef.current;
    const index = Math.min(positionRef.current.index, list.length - 1);
    const validate = list[index]?.validate;
    if (!validate) return true;
    setIsValidating(true);
    try {
      return await validate();
    } finally {
      setIsValidating(false);
    }
  }, [stepsRef]);

  const moveTo = useCallback(
    async (target: number, validateFirst: boolean): Promise<boolean> => {
      if (busyRef.current) return false;
      busyRef.current = true;
      try {
        if (validateFirst && !(await validateCurrent())) return false;
        setPosition((previous) => ({
          index: target,
          furthest: Math.max(previous.furthest, target),
        }));
        return true;
      } finally {
        busyRef.current = false;
      }
    },
    [validateCurrent, setPosition],
  );

  const next = useCallback(async () => {
    const list = stepsRef.current;
    const index = Math.min(positionRef.current.index, list.length - 1);
    if (index >= list.length - 1) {
      if (busyRef.current) return false;
      busyRef.current = true;
      try {
        return await validateCurrent();
      } finally {
        busyRef.current = false;
      }
    }
    return moveTo(index + 1, true);
  }, [stepsRef, validateCurrent, moveTo]);

  const back = useCallback(() => {
    if (busyRef.current) return;
    const last = stepsRef.current.length - 1;
    setPosition((previous) => ({
      ...previous,
      index: Math.max(0, Math.min(previous.index, last) - 1),
    }));
  }, [stepsRef, setPosition]);

  const canGoTo = useCallback(
    (index: number) => Number.isInteger(index) && index >= 0 && index <= furthestIndex,
    [furthestIndex],
  );

  const goTo = useCallback(
    async (index: number) => {
      const { index: current, furthest } = positionRef.current;
      const maxIndex = Math.min(furthest, stepsRef.current.length - 1);
      if (!Number.isInteger(index) || index < 0 || index > maxIndex) return false;
      if (index === current) return true;
      return moveTo(index, index > current);
    },
    [stepsRef, moveTo],
  );

  const reset = useCallback(() => {
    setPosition(() => ({ index: 0, furthest: 0 }));
  }, [setPosition]);

  return {
    steps,
    currentIndex,
    currentStep,
    stepCount: steps.length,
    isFirst: currentIndex === 0,
    isLast: currentIndex === lastIndex,
    progress: (currentIndex + 1) / steps.length,
    furthestIndex,
    isValidating,
    next,
    back,
    goTo,
    canGoTo,
    reset,
  };
}
