import { createContext, use, useContext, useId, useMemo, useState, type ReactNode } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';

type Density = 'comfortable' | 'compact';
type Tone = 'accent' | 'success';

interface Theme {
  density: Density;
  tone: Tone;
}

interface User {
  name: string;
  role: 'viewer' | 'editor';
}

/** The default value is what consumers see when no provider is above them. */
const ThemeContext = createContext<Theme>({ density: 'comfortable', tone: 'accent' });
ThemeContext.displayName = 'ThemeContext';

/** `null` = signed out. Consumers must handle it. */
const UserContext = createContext<User | null>(null);
UserContext.displayName = 'UserContext';

/**
 * Provider composition: one component nests the app's providers so the tree
 * does not turn into a pyramid. React 19 renders a context directly as its
 * provider: `<ThemeContext value={...}>` (no `.Provider`).
 */
function AppProviders({
  theme,
  user,
  children,
}: {
  theme: Theme;
  user: User | null;
  children: ReactNode;
}) {
  return (
    <ThemeContext value={theme}>
      <UserContext value={user}>{children}</UserContext>
    </ThemeContext>
  );
}

/** Shared context, multiple contexts, nested overrides and `use(Context)`. */
export default function UseContextDemo() {
  // Each value lives in its own state, so its identity only changes when it
  // actually changes — consumers of the other context are not affected.
  const [theme, setTheme] = useState<Theme>({ density: 'comfortable', tone: 'accent' });
  const [user, setUser] = useState<User | null>({ name: 'Ada', role: 'editor' });
  const [showGreeting, setShowGreeting] = useState(true);
  const densityId = useId();

  return (
    <div className="stack">
      <Panel title="Controls (owned by the provider component)">
        <div className="grid">
          <div className="field">
            <label className="field-label" htmlFor={densityId}>
              Density
            </label>
            <select
              id={densityId}
              value={theme.density}
              onChange={(event) =>
                setTheme((previous) => ({ ...previous, density: event.target.value as Density }))
              }
            >
              <option value="comfortable">comfortable</option>
              <option value="compact">compact</option>
            </select>
          </div>
          {user ? (
            <TextField
              label="User name"
              value={user.name}
              onChange={(event) => setUser({ ...user, name: event.target.value })}
            />
          ) : null}
        </div>
        <div className="row">
          <Button onClick={() => setUser(user ? null : { name: 'Ada', role: 'editor' })}>
            {user ? 'Sign out' : 'Sign in'}
          </Button>
          <label className="row">
            <input
              type="checkbox"
              checked={showGreeting}
              onChange={(event) => setShowGreeting(event.target.checked)}
            />
            Show greeting (reads context with <code>use()</code> after an early return)
          </label>
        </div>
      </Panel>

      <AppProviders theme={theme} user={user}>
        <Panel title="Inside the providers">
          <ThemedCard label="Outer card">
            <UserBadge />
            <Greeting show={showGreeting} />
          </ThemedCard>
          <SuccessTone>
            <ThemedCard label="Nested provider overrides the tone">
              <UserBadge />
            </ThemedCard>
          </SuccessTone>
        </Panel>
      </AppProviders>

      <Panel title="Outside any provider">
        <ThemedCard label="Default value">
          <UserBadge />
        </ThemedCard>
      </Panel>

      <Callout title="React 19 syntax">
        <code>&lt;ThemeContext value=&#123;theme&#125;&gt;</code> replaces{' '}
        <code>&lt;ThemeContext.Provider&gt;</code> (still supported, slated for deprecation).{' '}
        <code>use(ThemeContext)</code> reads context like <code>useContext</code> but may be called
        inside conditions and loops.
      </Callout>
    </div>
  );
}

/** A nested provider overrides part of the value for its subtree only. */
function SuccessTone({ children }: { children: ReactNode }) {
  const outer = useContext(ThemeContext);
  // Memoised so the nested value only changes when the outer one does.
  const value = useMemo<Theme>(() => ({ ...outer, tone: 'success' }), [outer]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

function ThemedCard({ label, children }: { label: string; children: ReactNode }) {
  const { density, tone } = useContext(ThemeContext);
  return (
    <section
      className="card stack"
      aria-label={label}
      style={{
        padding: density === 'compact' ? '0.5rem' : '1.25rem',
        borderColor: `var(--${tone})`,
        borderWidth: 2,
      }}
    >
      <div className="spread">
        <strong>{label}</strong>
        <span className="row">
          <Badge>density: {density}</Badge>
          <Badge tone={tone === 'success' ? 'success' : 'info'}>tone: {tone}</Badge>
        </span>
      </div>
      {children}
    </section>
  );
}

function UserBadge() {
  const user = useContext(UserContext);
  return (
    <p className="small">{user ? `Signed in as ${user.name} (${user.role})` : 'Signed out'}</p>
  );
}

function Greeting({ show }: { show: boolean }) {
  if (!show) return null;
  // `use` is not bound by the "top level only" rule, unlike useContext.
  const user = use(UserContext);
  return <p>{user ? `Hello, ${user.name}!` : 'Hello, guest!'}</p>;
}
