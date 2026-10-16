import { act, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createEmitter } from './createEmitter';
import { useEventEmitter } from './useEventEmitter';

type TestEvents = { toast: { text: string }; logout: void };

describe('createEmitter', () => {
  it('delivers typed payloads to every handler in order', () => {
    const emitter = createEmitter<TestEvents>();
    const calls: string[] = [];
    emitter.on('toast', ({ text }) => calls.push(`a:${text}`));
    emitter.on('toast', ({ text }) => calls.push(`b:${text}`));
    emitter.emit('toast', { text: 'hi' });
    expect(calls).toEqual(['a:hi', 'b:hi']);
  });

  it('supports void events and typed emit arguments', () => {
    const emitter = createEmitter<TestEvents>();
    const onLogout = vi.fn();
    emitter.on('logout', onLogout);
    emitter.emit('logout');
    expect(onLogout).toHaveBeenCalledTimes(1);
    expectTypeOf(emitter.emit<'toast'>).parameters.toEqualTypeOf<['toast', { text: string }]>();
  });

  it('unsubscribes with the returned function, off() and clear()', () => {
    const emitter = createEmitter<TestEvents>();
    const handler = vi.fn();
    const unsubscribe = emitter.on('logout', handler);
    expect(emitter.listenerCount('logout')).toBe(1);
    unsubscribe();
    expect(emitter.listenerCount()).toBe(0);

    emitter.on('logout', handler);
    emitter.off('logout', handler);
    emitter.on('toast', handler);
    emitter.clear();
    emitter.emit('logout');
    emitter.emit('toast', { text: 'x' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('is safe against (un)subscribing during emit', () => {
    const emitter = createEmitter<TestEvents>();
    const late = vi.fn();
    const first = vi.fn(() => {
      unsubscribeFirst();
      emitter.on('logout', late);
    });
    const unsubscribeFirst = emitter.on('logout', first);
    emitter.emit('logout');
    expect(late).not.toHaveBeenCalled();
    emitter.emit('logout');
    expect(first).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('runs every handler even if one throws, then re-throws', () => {
    const emitter = createEmitter<TestEvents>();
    const after = vi.fn();
    emitter.on('logout', () => {
      throw new Error('boom');
    });
    emitter.on('logout', after);
    expect(() => emitter.emit('logout')).toThrow('boom');
    expect(after).toHaveBeenCalled();

    emitter.on('logout', () => {
      throw new Error('again');
    });
    expect(() => emitter.emit('logout')).toThrow(AggregateError);
  });

  it('methods work when destructured', () => {
    const { on, emit } = createEmitter<TestEvents>();
    const handler = vi.fn();
    const off = on('logout', handler);
    emit('logout');
    off();
    emit('logout');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('useEventEmitter', () => {
  it('subscribes on mount and unsubscribes on unmount', () => {
    const emitter = createEmitter<TestEvents>();
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEventEmitter(emitter, 'toast', handler));
    expect(emitter.listenerCount('toast')).toBe(1);
    emitter.emit('toast', { text: 'one' });
    expect(handler).toHaveBeenCalledWith({ text: 'one' });
    unmount();
    expect(emitter.listenerCount()).toBe(0);
  });

  it('calls the latest handler without re-subscribing', () => {
    const emitter = createEmitter<TestEvents>();
    const on = vi.spyOn(emitter, 'on');
    function Listener() {
      const [count, setCount] = useState(0);
      useEventEmitter(emitter, 'logout', () => setCount(count + 1));
      return <p>count: {count}</p>;
    }
    render(<Listener />);
    act(() => emitter.emit('logout'));
    act(() => emitter.emit('logout'));
    expect(screen.getByText('count: 2')).toBeInTheDocument();
    expect(on).toHaveBeenCalledTimes(1);
  });

  it('pauses with a null emitter and switches emitters', () => {
    const a = createEmitter<TestEvents>();
    const b = createEmitter<TestEvents>();
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ emitter }: { emitter: typeof a | null }) => useEventEmitter(emitter, 'logout', handler),
      { initialProps: { emitter: null as typeof a | null } },
    );
    a.emit('logout');
    expect(handler).not.toHaveBeenCalled();

    rerender({ emitter: a });
    rerender({ emitter: b });
    expect(a.listenerCount()).toBe(0);
    b.emit('logout');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
