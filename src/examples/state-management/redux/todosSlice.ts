import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  createTodo,
  errorMessage,
  fetchTodos as requestTodos,
  type Todo,
} from '../shared/todosApi';

export type Filter = 'all' | 'active' | 'done';

export interface TodosState {
  items: Todo[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  adding: boolean;
  filter: Filter;
}

const initialState: TodosState = {
  items: [],
  status: 'idle',
  error: null,
  adding: false,
  filter: 'all',
};

/**
 * GET /api/todos. `condition` skips the request while one is in flight, so
 * Strict Mode's double effect (or a double click) does not fetch twice.
 */
export const fetchTodos = createAsyncThunk<
  Todo[],
  void,
  { state: { todos: TodosState }; rejectValue: string }
>(
  'todos/fetch',
  async (_arg, { signal, rejectWithValue }) => {
    try {
      return await requestTodos(signal);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
  { condition: (_arg, { getState }) => getState().todos.status !== 'loading' },
);

/** POST /api/todos. The mock rejects titles containing "fail" with a 500. */
export const addTodo = createAsyncThunk<Todo, string, { rejectValue: string }>(
  'todos/add',
  async (title, { signal, rejectWithValue }) => {
    try {
      return await createTodo(title, signal);
    } catch (error) {
      return rejectWithValue(errorMessage(error));
    }
  },
);

export const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    // Immer lets case reducers "mutate" a draft; the result is still immutable.
    todoToggled(state, action: PayloadAction<string>) {
      const todo = state.items.find((item) => item.id === action.payload);
      if (todo) todo.completed = !todo.completed;
    },
    filterChanged(state, action: PayloadAction<Filter>) {
      state.filter = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error.message ?? 'Unknown error';
      })
      .addCase(addTodo.pending, (state) => {
        state.adding = true;
      })
      .addCase(addTodo.fulfilled, (state, action) => {
        state.adding = false;
        state.items.push(action.payload);
      })
      .addCase(addTodo.rejected, (state) => {
        state.adding = false;
      });
  },
  selectors: {
    selectTodosStatus: (state) => state.status,
    selectTodosError: (state) => state.error,
    selectIsAdding: (state) => state.adding,
    selectFilter: (state) => state.filter,
    selectItems: (state) => state.items,
  },
});

export const { todoToggled, filterChanged } = todosSlice.actions;
export const { selectTodosStatus, selectTodosError, selectIsAdding, selectFilter, selectItems } =
  todosSlice.selectors;
