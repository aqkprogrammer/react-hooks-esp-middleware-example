import { act, renderHook } from '@testing-library/react';
import { BehaviorSubject, interval, map, of, Subject, take, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useObservable, type ObservableLike } from './useObservable';

afterEach(() => vi.useRealTimers());

describe('useObservable (RxJS 7)', () => {
  it('shows a BehaviorSubject value on the first commit and follows next()', () => {
    const subject = new BehaviorSubject(1);
    const { result } = renderHook(() => useObservable(subject, 0));
    expect(result.current).toEqual({ value: 1, status: 'active', error: null });
    act(() => subject.next(2));
    expect(result.current.value).toBe(2);
  });

  it('returns the initial value until a Subject emits', () => {
    const subject = new Subject<string>();
    const { result } = renderHook(() => useObservable(subject, 'waiting…'));
    expect(result.current).toEqual({ value: 'waiting…', status: 'waiting', error: null });
    act(() => subject.next('hello'));
    expect(result.current).toEqual({ value: 'hello', status: 'active', error: null });
  });

  it('works with operators and timers', () => {
    vi.useFakeTimers();
    const ticks = interval(100).pipe(
      map((n) => n * 10),
      take(3),
    );
    const { result } = renderHook(() => useObservable(ticks, -1));
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.value).toBe(0);
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toEqual({ value: 20, status: 'complete', error: null });
  });

  it('keeps the last value when the observable completes', () => {
    // Observables must be stable: creating `of(...)` inside render would re-subscribe forever.
    const numbers = of(1, 2, 3);
    const { result } = renderHook(() => useObservable(numbers, 0));
    expect(result.current).toEqual({ value: 3, status: 'complete', error: null });
  });

  it('captures errors', () => {
    const failing = throwError(() => new Error('stream failed'));
    const { result } = renderHook(() => useObservable<number>(failing, 7));
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('stream failed');
    expect(result.current.value).toBe(7);
  });

  it('unsubscribes on unmount', () => {
    const subject = new Subject<number>();
    const { unmount } = renderHook(() => useObservable(subject, 0));
    expect(subject.observed).toBe(true);
    unmount();
    expect(subject.observed).toBe(false);
  });

  it('switches sources and never shows the previous source’s value', () => {
    const first = new BehaviorSubject('a');
    const second = new Subject<string>();
    const { result, rerender } = renderHook(({ source }) => useObservable(source, 'init'), {
      initialProps: { source: first as ObservableLike<string> },
    });
    expect(result.current.value).toBe('a');

    rerender({ source: second });
    expect(result.current).toEqual({ value: 'init', status: 'waiting', error: null });
    expect(first.observed).toBe(false);
    act(() => first.next('stale'));
    expect(result.current.value).toBe('init');
    act(() => second.next('b'));
    expect(result.current.value).toBe('b');
  });

  it('accepts null (no subscription)', () => {
    const { result } = renderHook(() => useObservable<number>(null, 5));
    expect(result.current).toEqual({ value: 5, status: 'waiting', error: null });
  });

  it('works with any minimal observable, not just RxJS', () => {
    const unsubscribe = vi.fn();
    const minimal: ObservableLike<number> = {
      subscribe(observer) {
        observer.next(99);
        return { unsubscribe };
      },
    };
    const { result, unmount } = renderHook(() => useObservable(minimal, 0));
    expect(result.current.value).toBe(99);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
