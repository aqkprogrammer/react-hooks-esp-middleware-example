import { describe, expect, it, vi } from 'vitest';
import { createReducerStore } from '../createReducerStore';
import type { Middleware } from '../types';
import { createConsoleSink, createLogger, describeAction, type LogRecord } from './logger';

type Action = { type: 'add'; amount: number } | { type: 'noop' };
const reducer = (state: number, action: Action) =>
  action.type === 'add' ? state + action.amount : state;

describe('createLogger', () => {
  it('sends prev/next state, the action and the duration to the sink', () => {
    const records: LogRecord<number, Action>[] = [];
    let clock = 0;
    const store = createReducerStore(reducer, 1, [
      createLogger<number, Action>({
        sink: (record) => records.push(record),
        now: () => (clock += 5),
      }),
    ]);
    store.dispatch({ type: 'add', amount: 2 });
    store.dispatch({ type: 'noop' });
    expect(records).toEqual([
      {
        action: { type: 'add', amount: 2 },
        prevState: 1,
        nextState: 3,
        changed: true,
        durationMs: 5,
      },
      { action: { type: 'noop' }, prevState: 3, nextState: 3, changed: false, durationMs: 5 },
    ]);
  });

  it('skips actions rejected by the predicate but still forwards them', () => {
    const sink = vi.fn();
    const store = createReducerStore(reducer, 0, [
      createLogger<number, Action>({ sink, predicate: (action) => action.type !== 'add' }),
    ]);
    store.dispatch({ type: 'add', amount: 4 });
    expect(store.getState()).toBe(4);
    expect(sink).not.toHaveBeenCalled();
  });

  it('logs nothing and propagates the error when a later step throws', () => {
    const sink = vi.fn();
    const explode: Middleware<number, Action> = () => () => () => {
      throw new Error('boom');
    };
    const store = createReducerStore(reducer, 0, [createLogger<number, Action>({ sink }), explode]);
    expect(() => store.dispatch({ type: 'noop' })).toThrow('boom');
    expect(sink).not.toHaveBeenCalled();
  });

  it('writes collapsed or expanded console groups with the default sink', () => {
    const fakeConsole = {
      group: vi.fn(),
      groupCollapsed: vi.fn(),
      groupEnd: vi.fn(),
      log: vi.fn(),
    };
    const record: LogRecord<number, Action> = {
      action: { type: 'noop' },
      prevState: 0,
      nextState: 0,
      changed: false,
      durationMs: 1.234,
    };
    createConsoleSink<number, Action>({ console: fakeConsole })(record);
    expect(fakeConsole.groupCollapsed).toHaveBeenCalledWith('action noop (1.2 ms)');
    createConsoleSink<number, Action>({ console: fakeConsole, collapsed: false })(record);
    expect(fakeConsole.group).toHaveBeenCalledWith('action noop (1.2 ms)');
    expect(fakeConsole.log).toHaveBeenCalledWith('next state', 0);
    expect(fakeConsole.groupEnd).toHaveBeenCalledTimes(2);
  });

  it('uses the console by default', () => {
    const groupCollapsed = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const store = createReducerStore(reducer, 0, [createLogger<number, Action>()]);
    store.dispatch({ type: 'add', amount: 1 });
    expect(groupCollapsed).toHaveBeenCalledWith(expect.stringMatching(/^action add/));
  });

  it('describes objects, thunks and other values', () => {
    expect(describeAction({ type: 'x' })).toBe('x');
    expect(describeAction(() => undefined)).toBe('thunk');
    expect(describeAction(42)).toBe('42');
  });
});
