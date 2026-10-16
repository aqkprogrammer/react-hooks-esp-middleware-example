import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runSyncValidators,
  useFormValidation,
  validateSync,
  type ValidationRules,
} from './useFormValidation';

interface Values {
  username: string;
  password: string;
  confirm: string;
}

const values = (patch: Partial<Values> = {}): Values => ({
  username: '',
  password: '',
  confirm: '',
  ...patch,
});

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

const required = (value: string) => (value ? undefined : 'Required');

afterEach(() => vi.useRealTimers());

describe('runSyncValidators / validateSync', () => {
  it('returns the first message in order and supports cross-field rules', () => {
    const rules: ValidationRules<Values> = {
      password: { validate: [required, (value) => (value.length < 8 ? 'Too short' : undefined)] },
      confirm: { validate: (value, all) => (value === all.password ? undefined : 'Mismatch') },
    };
    expect(runSyncValidators(rules.password?.validate, '', values())).toBe('Required');
    expect(validateSync(rules, values({ password: 'abc', confirm: 'abd' }))).toEqual({
      password: 'Too short',
      confirm: 'Mismatch',
    });
    expect(validateSync(rules, values({ password: 'abcdefgh', confirm: 'abcdefgh' }))).toEqual({});
  });
});

describe('useFormValidation', () => {
  it('stores sync errors and clears them when fixed', async () => {
    const { result } = renderHook(() =>
      useFormValidation<Values>({ username: { validate: required } }),
    );
    await act(() => result.current.validateField('username', values()));
    expect(result.current.errors).toEqual({ username: 'Required' });
    await act(() => result.current.validateField('username', values({ username: 'ada' })));
    expect(result.current.errors).toEqual({});
  });

  it('skips the async validator when a sync validator fails', async () => {
    const validateAsync = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useFormValidation<Values>({ username: { validate: required, validateAsync } }),
    );
    await act(() => result.current.validateField('username', values()));
    expect(validateAsync).not.toHaveBeenCalled();
    expect(result.current.errors.username).toBe('Required');
  });

  it('ignores a stale async result that resolves after a newer one (race)', async () => {
    const slow = deferred<string | undefined>();
    const fast = deferred<string | undefined>();
    const signals: AbortSignal[] = [];
    const validateAsync = vi.fn((value: string, _all: Values, signal: AbortSignal) => {
      signals.push(signal);
      return value === 'ad' ? slow.promise : fast.promise;
    });
    const { result } = renderHook(() => useFormValidation<Values>({ username: { validateAsync } }));

    let first: Promise<string | undefined> = Promise.resolve(undefined);
    let second: Promise<string | undefined> = Promise.resolve(undefined);
    act(() => {
      first = result.current.validateField('username', values({ username: 'ad' }));
    });
    expect(result.current.validating.username).toBe(true);
    act(() => {
      second = result.current.validateField('username', values({ username: 'ada' }));
    });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    await act(async () => {
      fast.resolve(undefined); // "ada" is available
      await second;
    });
    await act(async () => {
      slow.resolve('Taken'); // the stale answer for "ad" arrives last
      await first;
    });
    expect(result.current.errors.username).toBeUndefined();
    expect(result.current.validating.username).toBeUndefined();
    // The superseded call resolves with the newer run's result.
    await expect(first).resolves.toBeUndefined();
  });

  it('debounces change-triggered async validation but not immediate runs', async () => {
    vi.useFakeTimers();
    const validateAsync = vi.fn(async (value: string) => (value === 'taken' ? 'Taken' : undefined));
    const { result } = renderHook(() =>
      useFormValidation<Values>({ username: { validateAsync, asyncDebounceMs: 300 } }),
    );
    act(() => {
      void result.current.validateField('username', values({ username: 'ta' }));
      void result.current.validateField('username', values({ username: 'taken' }));
    });
    expect(validateAsync).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(validateAsync).toHaveBeenCalledTimes(1);
    expect(validateAsync).toHaveBeenCalledWith('taken', expect.anything(), expect.any(AbortSignal));
    expect(result.current.errors.username).toBe('Taken');

    await act(() =>
      result.current.validateField('username', values({ username: 'free' }), { immediate: true }),
    );
    expect(validateAsync).toHaveBeenCalledTimes(2);
    expect(result.current.errors.username).toBeUndefined();
  });

  it('validateAll runs every rule and returns the error map', async () => {
    const { result } = renderHook(() =>
      useFormValidation<Values>({
        username: { validate: required, validateAsync: async () => 'Taken' },
        password: { validate: required },
      }),
    );
    let errors = {};
    await act(async () => {
      errors = await result.current.validateAll(values({ username: 'ada' }));
    });
    expect(errors).toEqual({ username: 'Taken', password: 'Required' });
    expect(result.current.errors).toEqual(errors);
  });

  it('reports a thrown async validator error as the field message', async () => {
    const { result } = renderHook(() =>
      useFormValidation<Values>({
        username: {
          validateAsync: async () => {
            throw new Error('Network down');
          },
        },
      }),
    );
    await act(() => result.current.validateField('username', values({ username: 'x' })));
    expect(result.current.errors.username).toBe('Network down');
  });

  it('clearErrors cancels pending checks and setFieldError sets server errors', async () => {
    const pending = deferred<string | undefined>();
    let signal: AbortSignal | undefined;
    const { result } = renderHook(() =>
      useFormValidation<Values>({
        username: {
          validateAsync: (_value, _all, s) => {
            signal = s;
            return pending.promise;
          },
        },
      }),
    );
    act(() => {
      void result.current.validateField('username', values({ username: 'x' }));
    });
    act(() => result.current.clearErrors(['username']));
    expect(signal?.aborted).toBe(true);
    await act(async () => pending.resolve('Taken'));
    expect(result.current.errors).toEqual({});
    expect(result.current.isValidating).toBe(false);

    act(() => result.current.setFieldError('password', 'Rejected by server'));
    expect(result.current.errors).toEqual({ password: 'Rejected by server' });
    act(() => result.current.clearErrors());
    expect(result.current.errors).toEqual({});
  });

  it('aborts pending async validation on unmount', () => {
    let signal: AbortSignal | undefined;
    const { result, unmount } = renderHook(() =>
      useFormValidation<Values>({
        username: {
          validateAsync: (_value, _all, s) => {
            signal = s;
            return new Promise(() => {});
          },
        },
      }),
    );
    act(() => {
      void result.current.validateField('username', values({ username: 'x' }));
    });
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
