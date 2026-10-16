import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { machineTransition, useStateMachine, type MachineConfig } from './useStateMachine';

type State = 'idle' | 'loading' | 'success' | 'failure';
type Event =
  | { type: 'FETCH' }
  | { type: 'RESOLVE'; items: string[] }
  | { type: 'REJECT'; message: string }
  | { type: 'RETRY' }
  | { type: 'TIMEOUT' };
interface Context {
  items: string[];
  error: string | null;
  retries: number;
}

const MAX_RETRIES = 2;

function createConfig(
  hooks: { onLoading?: () => void; onLeaveLoading?: () => void } = {},
): MachineConfig<State, Context, Event> {
  return {
    initial: 'idle',
    context: { items: [], error: null, retries: 0 },
    states: {
      idle: { on: { FETCH: 'loading' } },
      loading: {
        entry: ({ send }) => {
          hooks.onLoading?.();
          const timer = setTimeout(() => send({ type: 'TIMEOUT' }), 1000);
          return () => {
            clearTimeout(timer);
            hooks.onLeaveLoading?.();
          };
        },
        on: {
          RESOLVE: {
            target: 'success',
            assign: (context, event) => ({ ...context, items: event.items, error: null }),
          },
          REJECT: {
            target: 'failure',
            assign: (context, event) => ({ ...context, error: event.message }),
          },
          TIMEOUT: {
            target: 'failure',
            assign: (context) => ({ ...context, error: 'timed out' }),
          },
        },
      },
      success: { on: { FETCH: 'loading' } },
      failure: {
        on: {
          RETRY: [
            {
              target: 'loading',
              guard: (context) => context.retries < MAX_RETRIES,
              assign: (context) => ({ ...context, retries: context.retries + 1 }),
            },
            // Fallback candidate: stay in failure but record why.
            { assign: (context) => ({ ...context, error: 'too many retries' }) },
          ],
        },
      },
    },
  };
}

afterEach(() => vi.useRealTimers());

describe('machineTransition (pure)', () => {
  const config = createConfig();
  const initial = { value: 'idle' as State, context: config.context, event: null, version: 0 };

  it('follows a string target and records the event', () => {
    const next = machineTransition(config, initial, { type: 'FETCH' });
    expect(next).toMatchObject({ value: 'loading', event: { type: 'FETCH' }, version: 1 });
  });

  it('returns the same snapshot for events the state does not accept', () => {
    expect(machineTransition(config, initial, { type: 'RESOLVE', items: [] })).toBe(initial);
  });
});

describe('useStateMachine', () => {
  it('transitions, assigns context and ignores invalid events', () => {
    const { result } = renderHook(() => useStateMachine(createConfig()));
    expect(result.current.value).toBe('idle');

    act(() => result.current.send({ type: 'RESOLVE', items: ['x'] }));
    expect(result.current.value).toBe('idle');

    act(() => result.current.send({ type: 'FETCH' }));
    expect(result.current.matches('loading')).toBe(true);

    act(() => result.current.send({ type: 'RESOLVE', items: ['a', 'b'] }));
    expect(result.current.value).toBe('success');
    expect(result.current.context.items).toEqual(['a', 'b']);
  });

  it('applies guards: first passing candidate wins, fallback otherwise', () => {
    const { result } = renderHook(() => useStateMachine(createConfig()));
    const fail = () => {
      act(() => result.current.send({ type: 'REJECT', message: 'nope' }));
    };
    act(() => result.current.send({ type: 'FETCH' }));
    fail();
    expect(result.current.value).toBe('failure');

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      act(() => result.current.send({ type: 'RETRY' }));
      expect(result.current.value).toBe('loading');
      expect(result.current.context.retries).toBe(attempt);
      fail();
    }

    expect(result.current.can({ type: 'RETRY' })).toBe(true);
    act(() => result.current.send({ type: 'RETRY' }));
    expect(result.current.value).toBe('failure');
    expect(result.current.context.error).toBe('too many retries');
    expect(result.current.can({ type: 'FETCH' })).toBe(false);
  });

  it('runs entry actions after commit and their cleanup on exit', () => {
    vi.useFakeTimers();
    const onLoading = vi.fn();
    const onLeaveLoading = vi.fn();
    const config = createConfig({ onLoading, onLeaveLoading });
    const { result } = renderHook(() => useStateMachine(config));

    act(() => result.current.send({ type: 'FETCH' }));
    expect(onLoading).toHaveBeenCalledTimes(1);

    act(() => result.current.send({ type: 'RESOLVE', items: [] }));
    expect(onLeaveLoading).toHaveBeenCalledTimes(1);
    // The timer was cleared, so TIMEOUT never fires.
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.value).toBe('success');
  });

  it('lets entry actions send events (timeout)', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStateMachine(createConfig()));
    act(() => result.current.send({ type: 'FETCH' }));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.value).toBe('failure');
    expect(result.current.context.error).toBe('timed out');
  });

  it('re-runs entry when re-entering the same state through another state', () => {
    const onLoading = vi.fn();
    const { result } = renderHook(() => useStateMachine(createConfig({ onLoading })));
    act(() => result.current.send({ type: 'FETCH' }));
    act(() => result.current.send({ type: 'REJECT', message: 'x' }));
    act(() => result.current.send({ type: 'RETRY' }));
    expect(onLoading).toHaveBeenCalledTimes(2);
  });

  it('cleans up the active entry action on unmount', () => {
    const onLeaveLoading = vi.fn();
    const { result, unmount } = renderHook(() => useStateMachine(createConfig({ onLeaveLoading })));
    act(() => result.current.send({ type: 'FETCH' }));
    unmount();
    expect(onLeaveLoading).toHaveBeenCalledTimes(1);
  });

  it('keeps send stable across renders', () => {
    const { result, rerender } = renderHook(() => useStateMachine(createConfig()));
    const send = result.current.send;
    act(() => result.current.send({ type: 'FETCH' }));
    rerender();
    expect(result.current.send).toBe(send);
  });
});
