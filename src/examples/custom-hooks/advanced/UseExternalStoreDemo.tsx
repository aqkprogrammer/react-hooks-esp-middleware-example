import { Button, Panel, RenderCount, TextField, ValueTable } from '../../../components/ui';
import { createStore, shallowEqualObjects, useExternalStore } from '../../../hooks/advanced';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

interface AppState {
  user: { name: string };
  todos: Todo[];
  theme: 'light' | 'dark';
  addTodo: (title: string) => void;
  toggleTodo: (id: number) => void;
  toggleTheme: () => void;
  rename: (name: string) => void;
}

/** Created once, outside React. Actions live in the store, like Zustand. */
const appStore = createStore<AppState>((set) => ({
  user: { name: 'Ada' },
  todos: [
    { id: 1, title: 'Learn useSyncExternalStore', done: true },
    { id: 2, title: 'Write a selector', done: false },
  ],
  theme: 'light',
  addTodo: (title) =>
    set((state) => ({
      todos: [...state.todos, { id: Date.now(), title, done: false }],
    })),
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
    })),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  rename: (name) => set({ user: { name } }),
}));

// Selectors at module level: stable, reusable, testable.
const selectName = (state: AppState) => state.user.name;
const selectTheme = (state: AppState) => state.theme;
const selectTodos = (state: AppState) => state.todos;
const selectStats = (state: AppState) => ({
  total: state.todos.length,
  done: state.todos.filter((todo) => todo.done).length,
});

function UserBadge() {
  const name = useExternalStore(appStore, selectName);
  const rename = useExternalStore(appStore, (state) => state.rename);
  return (
    <TextField label="User name" value={name} onChange={(event) => rename(event.target.value)} />
  );
}

function ThemeSwitch() {
  const theme = useExternalStore(appStore, selectTheme);
  return <Button onClick={() => appStore.getState().toggleTheme()}>Theme: {theme} (toggle)</Button>;
}

function TodoList() {
  const todos = useExternalStore(appStore, selectTodos);
  return (
    <ul className="list">
      {todos.map((todo) => (
        <li key={todo.id}>
          <label className="row">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => appStore.getState().toggleTodo(todo.id)}
            />
            {todo.title}
          </label>
        </li>
      ))}
    </ul>
  );
}

function Stats() {
  // A derived object: shallow equality keeps the same reference while the numbers are equal.
  const stats = useExternalStore(appStore, selectStats, shallowEqualObjects);
  return <ValueTable label="Todo stats" rows={{ Total: stats.total, Done: stats.done }} />;
}

export default function UseExternalStoreDemo() {
  return (
    <div className="stack">
      <p>
        Each box subscribes to a different slice of one store. Watch the commit counters: changing
        the name re-renders only the name box; ticking a todo re-renders the list and the stats, but
        not the theme switch.
      </p>
      <div className="grid">
        <Panel title="User slice">
          <RenderCount label="UserBadge">
            <UserBadge />
          </RenderCount>
        </Panel>
        <Panel title="Theme slice">
          <RenderCount label="ThemeSwitch">
            <ThemeSwitch />
          </RenderCount>
        </Panel>
        <Panel title="Todos slice">
          <RenderCount label="TodoList">
            <TodoList />
          </RenderCount>
          <Button onClick={() => appStore.getState().addTodo('New todo')}>Add todo</Button>
        </Panel>
        <Panel title="Derived stats (shallowEqualObjects)">
          <RenderCount label="Stats">
            <Stats />
          </RenderCount>
        </Panel>
      </div>
    </div>
  );
}
