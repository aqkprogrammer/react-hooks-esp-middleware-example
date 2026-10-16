/**
 * A pure reducer for the useReducer demo: a task board with filtering and
 * single-level undo. Actions form a discriminated union on `type`, and the
 * `default` branch assigns the action to `never`, so adding an action type
 * without handling it is a compile-time error.
 */

export interface Task {
  id: number;
  title: string;
  done: boolean;
}

export type TaskFilter = 'all' | 'active' | 'done';

export interface TasksState {
  tasks: Task[];
  filter: TaskFilter;
  nextId: number;
  /** Snapshot of `tasks` before the last undoable action. */
  previous: Task[] | null;
}

export type TasksAction =
  | { type: 'added'; title: string }
  | { type: 'toggled'; id: number }
  | { type: 'deleted'; id: number }
  | { type: 'clearedCompleted' }
  | { type: 'filterChanged'; filter: TaskFilter }
  | { type: 'undone' };

/** Lazy initialiser (third argument of useReducer): builds state from titles. */
export function createInitialState(titles: readonly string[]): TasksState {
  return {
    tasks: titles.map((title, index) => ({ id: index + 1, title, done: false })),
    filter: 'all',
    nextId: titles.length + 1,
    previous: null,
  };
}

function withUndo(state: TasksState, tasks: Task[]): TasksState {
  return { ...state, tasks, previous: state.tasks };
}

export function tasksReducer(state: TasksState, action: TasksAction): TasksState {
  switch (action.type) {
    case 'added': {
      const title = action.title.trim();
      if (!title) return state; // returning the same object skips the re-render
      return {
        ...withUndo(state, [...state.tasks, { id: state.nextId, title, done: false }]),
        nextId: state.nextId + 1,
      };
    }
    case 'toggled':
      return withUndo(
        state,
        state.tasks.map((task) => (task.id === action.id ? { ...task, done: !task.done } : task)),
      );
    case 'deleted':
      return withUndo(
        state,
        state.tasks.filter((task) => task.id !== action.id),
      );
    case 'clearedCompleted':
      return state.tasks.some((task) => task.done)
        ? withUndo(
            state,
            state.tasks.filter((task) => !task.done),
          )
        : state;
    case 'filterChanged':
      return state.filter === action.filter ? state : { ...state, filter: action.filter };
    case 'undone':
      return state.previous ? { ...state, tasks: state.previous, previous: null } : state;
    default: {
      // Exhaustiveness check: if a new action type is added to the union and
      // not handled above, `action` is no longer `never` and this fails to compile.
      const unhandled: never = action;
      throw new Error(`Unhandled action: ${JSON.stringify(unhandled)}`);
    }
  }
}

/** Derived data: computed from state during render, never stored. */
export function selectVisibleTasks(state: TasksState): Task[] {
  switch (state.filter) {
    case 'active':
      return state.tasks.filter((task) => !task.done);
    case 'done':
      return state.tasks.filter((task) => task.done);
    case 'all':
      return state.tasks;
  }
}
