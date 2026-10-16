import { Suspense, createContext, use, useId, useState, useTransition } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { clearProfileCache, getProfile, type ModernProfile } from './api';

type Theme = 'ocean' | 'forest' | 'sunset';
const ThemeContext = createContext<Theme>('ocean');

const choices = [
  { id: 1, label: 'Ada' },
  { id: 2, label: 'Grace' },
  { id: 3, label: 'Alan' },
  { id: 4, label: 'Missing (404)' },
] as const;

/**
 * `use(promise)` suspends until the promise settles; `use(context)` reads
 * context and — unlike `useContext` — may be called conditionally.
 *
 * The promise is *not* created during render: the click handler asks a
 * module-level cache for it, so the same Promise object is passed to `use`
 * on every render until a different profile is chosen.
 */
export default function UseDemo() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profilePromise, setProfilePromise] = useState<Promise<ModernProfile> | null>(null);
  const [withTransition, setWithTransition] = useState(true);
  const [readTheme, setReadTheme] = useState(false);
  const [theme, setTheme] = useState<Theme>('ocean');
  const [isPending, startTransition] = useTransition();
  const themeId = useId();

  const load = (id: number) => {
    const promise = getProfile(id);
    const apply = () => {
      setSelectedId(id);
      setProfilePromise(promise);
    };
    if (withTransition) startTransition(apply);
    else apply();
  };

  return (
    <div className="stack">
      <Panel
        title="Load a profile"
        description="Each request takes ~600 ms. Profiles are cached by id once loaded."
      >
        <div className="row" role="group" aria-label="Profiles">
          {choices.map((choice) => (
            <Button
              key={choice.id}
              aria-pressed={selectedId === choice.id}
              variant={selectedId === choice.id ? 'primary' : 'secondary'}
              onClick={() => load(choice.id)}
            >
              {choice.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            disabled={selectedId === null}
            onClick={() => {
              clearProfileCache();
              if (selectedId !== null) load(selectedId);
            }}
          >
            Refetch (clear cache)
          </Button>
        </div>
        <div className="row small">
          <label className="row">
            <input
              type="checkbox"
              checked={withTransition}
              onChange={(event) => setWithTransition(event.target.checked)}
            />
            Switch inside startTransition (keep old content instead of the fallback)
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={readTheme}
              onChange={(event) => setReadTheme(event.target.checked)}
            />
            Conditionally read theme with use(ThemeContext)
          </label>
          <label htmlFor={themeId}>Theme</label>
          <select
            id={themeId}
            value={theme}
            onChange={(event) => setTheme(event.target.value as Theme)}
          >
            <option value="ocean">ocean</option>
            <option value="forest">forest</option>
            <option value="sunset">sunset</option>
          </select>
        </div>
      </Panel>
      <ThemeContext value={theme}>
        <Panel title="Profile">
          <p role="status" className="small">
            {isPending ? <Badge tone="warn">Loading the next profile…</Badge> : null}
          </p>
          <ErrorBoundary
            resetKey={profilePromise}
            fallback={(error) => (
              <Callout tone="danger" title="Could not load the profile">
                <p>{error.message}</p>
                {/* A new promise changes resetKey, which clears the boundary. */}
                <Button size="sm" onClick={() => selectedId !== null && load(selectedId)}>
                  Try again
                </Button>
              </Callout>
            )}
          >
            <Suspense fallback={<p role="status">Loading profile…</p>}>
              {profilePromise ? (
                <ProfileCard profilePromise={profilePromise} readTheme={readTheme} />
              ) : (
                <p className="muted">Pick a profile above.</p>
              )}
            </Suspense>
          </ErrorBoundary>
        </Panel>
      </ThemeContext>
      <Callout title="Do not create the promise during render">
        <code>use(fetch(...))</code> in a component body creates a new promise on every render, so
        it suspends forever. Create it in an event handler, a loader or a cache, or receive it from
        a Server Component.
      </Callout>
    </div>
  );
}

function ProfileCard({
  profilePromise,
  readTheme,
}: {
  profilePromise: Promise<ModernProfile>;
  readTheme: boolean;
}) {
  const profile = use(profilePromise);
  // Allowed for `use` only: Hooks such as useContext can't be called conditionally.
  const theme = readTheme ? use(ThemeContext) : null;
  return (
    <article className="card stack" aria-label={`${profile.name} profile`}>
      <div className="spread">
        <strong>{profile.name}</strong>
        <Badge tone="info">{profile.role}</Badge>
      </div>
      <p>{profile.bio}</p>
      <p className="small muted">
        {theme ? `Theme read from context: ${theme}` : 'Theme context not read.'}
      </p>
    </article>
  );
}
