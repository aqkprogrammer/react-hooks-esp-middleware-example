import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  selectVisibleTasks,
  tasksReducer,
  type TasksAction,
} from './tasksReducer';

describe('tasksReducer', () => {
  const initial = createInitialState(['Write tests', 'Ship']);

  it('builds the initial state lazily from titles', () => {
    expect(initial).toEqual({
      tasks: [
        { id: 1, title: 'Write tests', done: false },
        { id: 2, title: 'Ship', done: false },
      ],
      filter: 'all',
      nextId: 3,
      previous: null,
    });
  });

  it('adds, toggles and deletes without mutating the previous state', () => {
    const frozen = Object.freeze({ ...initial, tasks: Object.freeze([...initial.tasks]) });
    let state = tasksReducer(frozen as typeof initial, { type: 'added', title: '  Docs ' });
    expect(state.tasks.at(-1)).toEqual({ id: 3, title: 'Docs', done: false });
    state = tasksReducer(state, { type: 'toggled', id: 1 });
    expect(state.tasks[0]?.done).toBe(true);
    state = tasksReducer(state, { type: 'deleted', id: 3 });
    expect(state.tasks.map((task) => task.id)).toEqual([1, 2]);
    expect(initial.tasks).toHaveLength(2);
  });

  it('returns the same state for no-op actions so React can bail out', () => {
    expect(tasksReducer(initial, { type: 'added', title: '   ' })).toBe(initial);
    expect(tasksReducer(initial, { type: 'clearedCompleted' })).toBe(initial);
    expect(tasksReducer(initial, { type: 'filterChanged', filter: 'all' })).toBe(initial);
    expect(tasksReducer(initial, { type: 'undone' })).toBe(initial);
  });

  it('undoes the last change', () => {
    const toggled = tasksReducer(initial, { type: 'toggled', id: 2 });
    const cleared = tasksReducer(toggled, { type: 'clearedCompleted' });
    expect(cleared.tasks).toHaveLength(1);
    const undone = tasksReducer(cleared, { type: 'undone' });
    expect(undone.tasks).toBe(toggled.tasks);
    expect(undone.previous).toBeNull();
  });

  it('filters visible tasks as derived data', () => {
    const state = tasksReducer(initial, { type: 'toggled', id: 1 });
    expect(selectVisibleTasks({ ...state, filter: 'done' }).map((task) => task.id)).toEqual([1]);
    expect(selectVisibleTasks({ ...state, filter: 'active' }).map((task) => task.id)).toEqual([2]);
    expect(selectVisibleTasks(state)).toHaveLength(2);
  });

  it('throws on unknown actions that bypass the type system', () => {
    expect(() => tasksReducer(initial, { type: 'nope' } as unknown as TasksAction)).toThrow(
      'Unhandled action: {"type":"nope"}',
    );
  });
});
