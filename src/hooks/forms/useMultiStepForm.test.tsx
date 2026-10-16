import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMultiStepForm, type FormStep } from './useMultiStepForm';

type StepId = 'account' | 'profile' | 'review';

function makeSteps(validators: Partial<Record<StepId, () => boolean | Promise<boolean>>> = {}) {
  const ids: StepId[] = ['account', 'profile', 'review'];
  return ids.map<FormStep<StepId>>((id) => ({ id, title: id, validate: validators[id] }));
}

describe('useMultiStepForm', () => {
  it('moves forward only when the current step validates', async () => {
    let accountValid = false;
    const steps = makeSteps({ account: () => accountValid });
    const { result } = renderHook(() => useMultiStepForm({ steps }));
    expect(result.current).toMatchObject({ currentIndex: 0, isFirst: true, isLast: false });
    expect(result.current.progress).toBeCloseTo(1 / 3);

    let moved = true;
    await act(async () => {
      moved = await result.current.next();
    });
    expect(moved).toBe(false);
    expect(result.current.currentIndex).toBe(0);

    accountValid = true;
    await act(async () => {
      moved = await result.current.next();
    });
    expect(moved).toBe(true);
    expect(result.current.currentStep.id).toBe('profile');
    expect(result.current.furthestIndex).toBe(1);
  });

  it('back never validates; goTo only reaches visited steps and validates when moving forward', async () => {
    const profile = vi.fn(() => true);
    const { result } = renderHook(() => useMultiStepForm({ steps: makeSteps({ profile }) }));
    expect(result.current.canGoTo(2)).toBe(false);
    await act(async () => {
      await result.current.next();
      await result.current.next();
    });
    expect(result.current.isLast).toBe(true);
    expect(profile).toHaveBeenCalledTimes(1);

    act(() => result.current.back());
    act(() => result.current.back());
    expect(result.current.currentIndex).toBe(0);
    expect(profile).toHaveBeenCalledTimes(1);

    let ok = false;
    await act(async () => {
      ok = await result.current.goTo(2);
    });
    expect(ok).toBe(true);
    expect(result.current.currentIndex).toBe(2);

    await act(async () => {
      ok = await result.current.goTo(7);
    });
    expect(ok).toBe(false);
  });

  it('exposes isValidating and ignores concurrent next() calls', async () => {
    let finish: (valid: boolean) => void = () => {};
    const account = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(() => useMultiStepForm({ steps: makeSteps({ account }) }));
    let first: Promise<boolean> = Promise.resolve(false);
    let second: Promise<boolean> = Promise.resolve(true);
    act(() => {
      first = result.current.next();
      second = result.current.next();
    });
    expect(result.current.isValidating).toBe(true);
    await expect(second).resolves.toBe(false);
    await act(async () => {
      finish(true);
      await first;
    });
    expect(account).toHaveBeenCalledTimes(1);
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isValidating).toBe(false);
  });

  it('next() on the last step validates without moving', async () => {
    const review = vi.fn(() => true);
    const { result } = renderHook(() =>
      useMultiStepForm({ steps: makeSteps({ review }), initialStep: 2 }),
    );
    let ok = false;
    await act(async () => {
      ok = await result.current.next();
    });
    expect(ok).toBe(true);
    expect(review).toHaveBeenCalled();
    expect(result.current.currentIndex).toBe(2);
  });

  it('clamps when steps are removed and resets', async () => {
    const { result, rerender } = renderHook(({ steps }) => useMultiStepForm({ steps }), {
      initialProps: { steps: makeSteps() },
    });
    await act(async () => {
      await result.current.goTo(0);
      await result.current.next();
      await result.current.next();
    });
    rerender({ steps: makeSteps().slice(0, 2) });
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isLast).toBe(true);
    act(() => result.current.back());
    expect(result.current.currentIndex).toBe(0);
    act(() => result.current.reset());
    expect(result.current.furthestIndex).toBe(0);
  });

  it('throws without steps', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useMultiStepForm({ steps: [] }))).toThrow(/at least one step/);
  });
});
