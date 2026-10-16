import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { useUserProfile } from './useUserProfile';
import { useUserProfileNaive } from './useUserProfileNaive';
import { PROFILES } from './users';
import './RaceSafeFetchingScenario.css';

/**
 * The same profile switcher twice, side by side: the left column uses a
 * naive fetch-in-effect (labelled as buggy), the right one `useUserProfile`
 * (built on `useFetch`). Latency is fixed per profile, so clicking a slow
 * profile and then a fast one reproduces the race every time.
 */
export default function RaceSafeFetchingScenario() {
  const [userId, setUserId] = useState(3);
  const raceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(raceTimer.current), []);

  const replayRace = () => {
    clearTimeout(raceTimer.current);
    const slow = userId === 1 ? 5 : 1;
    setUserId(slow);
    raceTimer.current = setTimeout(() => setUserId(4), 100);
  };

  return (
    <div className="stack">
      <Panel
        title="Choose a profile"
        description="Each profile has a fixed server latency. Pick a slow one, then quickly a fast one."
      >
        <div className="row" role="group" aria-label="Profiles">
          {PROFILES.map((profile) => (
            <Button
              key={profile.id}
              size="sm"
              variant={profile.id === userId ? 'primary' : 'secondary'}
              aria-pressed={profile.id === userId}
              onClick={() => setUserId(profile.id)}
            >
              {profile.label} ({profile.delayMs} ms)
            </Button>
          ))}
        </div>
        <div>
          <Button onClick={replayRace}>Replay the race (slow, then fast after 100 ms)</Button>
        </div>
      </Panel>

      <div className="race-safe-fetching-columns">
        <NaiveColumn userId={userId} />
        <SafeColumn userId={userId} />
      </div>

      <Callout title="Why the naive version shows the wrong person">
        Every click starts a request, and nothing stops the older ones. Requests finish in the order
        of their latency, not the order of the clicks, so a slow response for an earlier selection
        overwrites the newer one. It also stores a 404 body as if it were a user.
      </Callout>
      <Callout tone="success" title="How the safe hook prevents it">
        <code>useFetch</code> (via <code>useAsync</code>) gives each run an <code>AbortSignal</code>
        . Changing the id or unmounting aborts the previous request, and a run that was superseded
        can never set state — even if the server ignores the abort. Errors are typed (
        <code>HttpError</code>) and the body is validated.
      </Callout>
      <Callout title="When to use TanStack Query instead">
        This hook has no cache: two components asking for the same user make two requests, and
        nothing refetches stale data. When several screens share server data, or you need caching,
        request deduplication, background refetching, retries, pagination helpers or invalidation
        after mutations, use TanStack Query (or SWR / your framework’s loader). They solve this race
        for you too.
      </Callout>
    </div>
  );
}

function ProfileCard({
  title,
  badge,
  selectedId,
  shown,
  children,
}: {
  title: string;
  badge: ReactNode;
  selectedId: number;
  /** What is on screen. The naive column may hold an unvalidated error body. */
  shown: { id?: unknown } | null;
  children: ReactNode;
}) {
  const inSync = shown === null || shown.id === selectedId;
  return (
    <Panel title={title}>
      <div className="spread">
        {badge}
        {inSync ? (
          <Badge tone="success">In sync</Badge>
        ) : (
          <Badge tone="warn">
            Out of sync: shows #{String(shown.id)}, selected #{selectedId}
          </Badge>
        )}
      </div>
      <div className="race-safe-fetching-card" aria-live="polite">
        {children}
      </div>
    </Panel>
  );
}

function NaiveColumn({ userId }: { userId: number }) {
  const { user, error } = useUserProfileNaive(userId);
  return (
    <ProfileCard
      title="Naive fetch in useEffect"
      badge={<Badge tone="warn">Buggy on purpose</Badge>}
      selectedId={userId}
      shown={user}
    >
      {error ? <p className="race-safe-fetching-error">{error}</p> : null}
      {user ? (
        <dl className="race-safe-fetching-fields">
          <dt>Name</dt>
          <dd>{String(user.name)}</dd>
          <dt>Email</dt>
          <dd>{String(user.email)}</dd>
        </dl>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </ProfileCard>
  );
}

function SafeColumn({ userId }: { userId: number }) {
  const profile = useUserProfile(userId);
  return (
    <ProfileCard
      title="useUserProfile (useFetch)"
      badge={<Badge tone="success">Race-safe</Badge>}
      selectedId={userId}
      shown={profile.status === 'success' ? profile.data : null}
    >
      {profile.status === 'pending' ? <p className="muted">Loading…</p> : null}
      {profile.status === 'error' ? (
        <div className="row">
          <p className="race-safe-fetching-error">{profile.error.message}</p>
          <Button size="sm" onClick={profile.reload}>
            Retry
          </Button>
        </div>
      ) : null}
      {profile.status === 'success' ? (
        <dl className="race-safe-fetching-fields">
          <dt>Name</dt>
          <dd>{profile.data.name}</dd>
          <dt>Email</dt>
          <dd>{profile.data.email}</dd>
        </dl>
      ) : null}
    </ProfileCard>
  );
}
