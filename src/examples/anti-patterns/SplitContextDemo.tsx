import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Button, Callout, Panel, RenderCount, TextField } from '../../components/ui';
import './antiPatterns.css';

type Theme = 'light' | 'dark';
interface User {
  name: string;
}
const USER: User = { name: 'Ada' };

/**
 * Corrected version of broken/OneBigContext.tsx, next to the problem it
 * fixes. Consumers are created once by this component and passed as
 * `children`, so the only thing that can re-render them is a context change
 * — the commit counters show exactly who re-renders when you type.
 */
export default function SplitContextDemo() {
  return (
    <div className="stack">
      <div className="ap-columns">
        <Panel title="One context for everything" description="A new value object on every change.">
          <SingleProvider>
            <SingleAvatar />
            <SingleThemeToggle />
            <SingleSearch />
          </SingleProvider>
        </Panel>
        <Panel title="Split contexts" description="User, theme and search change independently.">
          <SplitProviders>
            <SplitAvatar />
            <SplitThemeToggle />
            <SplitSearch />
          </SplitProviders>
        </Panel>
      </div>
      <Callout title="Other options">
        Fast-changing values (search text, pointer position) often do not belong in context at all —
        keep them local, or use a store with selectors (Zustand, Redux, Jotai or{' '}
        <code>useSyncExternalStore</code>) so components subscribe to just the slice they read.
      </Callout>
    </div>
  );
}

// ---- One big context (the anti-pattern) -----------------------------------

interface AppState {
  user: User;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  search: string;
  setSearch: (search: string) => void;
}
const AppContext = createContext<AppState | null>(null);

function useApp(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <SingleProvider>');
  return value;
}

function SingleProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [search, setSearch] = useState('');
  // A new object on every render: every consumer re-renders on any change.
  const value = { user: USER, theme, setTheme, search, setSearch };
  return <AppContext value={value}>{children}</AppContext>;
}

function SingleAvatar() {
  const { user } = useApp();
  return <RenderCount label="Single · Avatar">Signed in as {user.name}</RenderCount>;
}

function SingleThemeToggle() {
  const { theme, setTheme } = useApp();
  return (
    <RenderCount label="Single · Theme">
      <Button size="sm" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Theme (single): {theme}
      </Button>
    </RenderCount>
  );
}

function SingleSearch() {
  const { search, setSearch } = useApp();
  return (
    <RenderCount label="Single · Search">
      <TextField
        label="Search (single context)"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </RenderCount>
  );
}

// ---- Split contexts (the fix) ---------------------------------------------

const UserContext = createContext<User>(USER);
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);
const SearchContext = createContext<{ search: string; setSearch: (search: string) => void } | null>(
  null,
);

function SplitProviders({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [search, setSearch] = useState('');
  // Memoised per concern: typing only changes the search context's value.
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  const searchValue = useMemo(() => ({ search, setSearch }), [search]);
  return (
    <UserContext value={USER}>
      <ThemeContext value={themeValue}>
        <SearchContext value={searchValue}>{children}</SearchContext>
      </ThemeContext>
    </UserContext>
  );
}

function SplitAvatar() {
  const user = useContext(UserContext);
  return <RenderCount label="Split · Avatar">Signed in as {user.name}</RenderCount>;
}

function SplitThemeToggle() {
  const themeContext = useContext(ThemeContext);
  if (!themeContext) throw new Error('SplitThemeToggle must be used inside <SplitProviders>');
  const { theme, setTheme } = themeContext;
  return (
    <RenderCount label="Split · Theme">
      <Button size="sm" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Theme (split): {theme}
      </Button>
    </RenderCount>
  );
}

function SplitSearch() {
  const searchContext = useContext(SearchContext);
  if (!searchContext) throw new Error('SplitSearch must be used inside <SplitProviders>');
  const { search, setSearch } = searchContext;
  return (
    <RenderCount label="Split · Search">
      <TextField
        label="Search (split contexts)"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </RenderCount>
  );
}
