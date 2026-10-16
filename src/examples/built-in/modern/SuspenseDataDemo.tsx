import { Suspense, use, useState } from 'react';
import { Button, Callout, Panel } from '../../../components/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { fetchWidget, type WidgetData } from './api';

const WIDGETS = ['weather', 'stats', 'news'] as const;
type WidgetName = (typeof WIDGETS)[number];
type WidgetPromises = Record<WidgetName, Promise<WidgetData>>;

/**
 * Each widget reads its data with `use(promise)`. `<Suspense>` decides what
 * shows while data is loading, an error boundary decides what shows when a
 * promise rejects. Where you place the boundaries decides how the page
 * reveals and how far an error spreads.
 */
export default function SuspenseDataDemo() {
  const [promises, setPromises] = useState<WidgetPromises | null>(null);
  const [failStats, setFailStats] = useState(false);
  const [revealTogether, setRevealTogether] = useState(false);

  // Promises are created in event handlers, never during render.
  const loadAll = () =>
    setPromises({
      weather: fetchWidget('weather'),
      stats: fetchWidget('stats', failStats),
      news: fetchWidget('news'),
    });
  const retry = (name: WidgetName) =>
    setPromises((current) => (current ? { ...current, [name]: fetchWidget(name) } : current));

  const widgets = promises
    ? WIDGETS.map((name) => (
        <ErrorBoundary
          key={name}
          resetKey={promises[name]}
          fallback={(error) => (
            <section className="card" aria-label={`${name} widget`}>
              <p role="alert">{error.message}</p>
              <Button size="sm" onClick={() => retry(name)}>
                Retry {name}
              </Button>
            </section>
          )}
        >
          {revealTogether ? (
            <Widget name={name} promise={promises[name]} />
          ) : (
            <Suspense fallback={<WidgetSkeleton name={name} />}>
              <Widget name={name} promise={promises[name]} />
            </Suspense>
          )}
        </ErrorBoundary>
      ))
    : null;

  return (
    <div className="stack">
      <Panel title="Dashboard" description="Each widget fetches its own data (~500 ms).">
        <div className="row">
          <Button variant="primary" onClick={loadAll}>
            {promises ? 'Reload dashboard' : 'Load dashboard'}
          </Button>
          <label className="row small">
            <input
              type="checkbox"
              checked={failStats}
              onChange={(event) => setFailStats(event.target.checked)}
            />
            Make the stats service fail on the next load
          </label>
          <label className="row small">
            <input
              type="checkbox"
              checked={revealTogether}
              onChange={(event) => setRevealTogether(event.target.checked)}
            />
            One Suspense boundary for all widgets (reveal together)
          </label>
        </div>
      </Panel>
      {widgets === null ? (
        <p className="muted">Nothing loaded yet.</p>
      ) : revealTogether ? (
        <Suspense fallback={<p role="status">Loading dashboard…</p>}>
          <div className="grid">{widgets}</div>
        </Suspense>
      ) : (
        <div className="grid">{widgets}</div>
      )}
      <Callout title="Boundaries are UX decisions">
        One boundary per widget streams content in as it arrives; one boundary around the group
        avoids layout “popcorn”. Error boundaries next to each widget keep one failing service from
        taking down the whole page.
      </Callout>
    </div>
  );
}

function Widget({ name, promise }: { name: WidgetName; promise: Promise<WidgetData> }) {
  const data = use(promise);
  return (
    <section className="card" aria-label={`${name} widget`}>
      <strong>{data.title}</strong>
      <ul>
        {data.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

function WidgetSkeleton({ name }: { name: WidgetName }) {
  return (
    <section className="card" aria-label={`${name} widget`} aria-busy="true">
      <p role="status" className="muted">
        Loading {name}…
      </p>
    </section>
  );
}
