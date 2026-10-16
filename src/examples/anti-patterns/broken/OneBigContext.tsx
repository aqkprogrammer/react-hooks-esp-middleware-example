/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Anti-pattern: one context holding everything (user, theme, cart, a
 * fast-changing value) with a fresh object as its value. Every consumer
 * re-renders on *any* change — typing in the search box re-renders the
 * header avatar and the theme toggle. Corrected version: ../SplitContextDemo.tsx
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

interface AppState {
  user: { name: string };
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  search: string;
  setSearch: (search: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [search, setSearch] = useState('');
  // ❌ New object every render, mixing rarely- and frequently-changing values.
  const value = { user: { name: 'Ada' }, theme, setTheme, search, setSearch };
  return <AppContext value={value}>{children}</AppContext>;
}

export function Avatar() {
  // ❌ Only needs `user`, but re-renders on every keystroke in the search box.
  const { user } = useContext(AppContext)!;
  return <span>{user.name}</span>;
}
