export interface TodoItem {
  id: number;
  title: string;
  done: boolean;
}

export interface TodosState {
  items: TodoItem[];
  nextId: number;
}

export type TodosAction =
  | { type: 'added'; title: string }
  | { type: 'toggled'; id: number }
  | { type: 'removed'; id: number }
  | { type: 'clearedDone' };

export function todosReducer(state: TodosState, action: TodosAction): TodosState {
  switch (action.type) {
    case 'added':
      return {
        items: [...state.items, { id: state.nextId, title: action.title, done: false }],
        nextId: state.nextId + 1,
      };
    case 'toggled':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, done: !item.done } : item,
        ),
      };
    case 'removed':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
    case 'clearedDone':
      return state.items.some((item) => item.done)
        ? { ...state, items: state.items.filter((item) => !item.done) }
        : state;
  }
}

export const initialTodos: TodosState = {
  items: [
    { id: 1, title: 'Split state and dispatch contexts', done: true },
    { id: 2, title: 'Check which components re-render', done: false },
  ],
  nextId: 3,
};
