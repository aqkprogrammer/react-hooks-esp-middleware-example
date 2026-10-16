import { catalog, sectionLabels, sectionOrder } from '../../catalog';
import { Badge } from '../../components/ui';
import { useProgress } from '../preferences';
import { href } from '../router';

const sectionBlurbs: Record<(typeof sectionOrder)[number], string> = {
  'built-in': 'Every built-in hook in React 19.3, with version labels, live demos and pitfalls.',
  custom: 'A typed, tested library of reusable hooks — SSR-safe, with full cleanup.',
  scenario: 'Complete features that combine several hooks: search, tables, forms, modals and more.',
  state:
    'Reducers with middleware, context, external stores, Redux Toolkit, Zustand, Jotai, TanStack Query, SWR and RxJS.',
  esp: 'The original idea of this repository: esp-js event routing wired into React reducers through middleware.',
  testing: 'How the hooks and demos are tested: Testing Library, fake timers, MSW and SSR checks.',
  'anti-pattern':
    'The Rules of Hooks and the mistakes the linter catches — with corrected versions.',
};

export function HomePage() {
  const { completed } = useProgress();
  const counts = Object.fromEntries(
    sectionOrder.map((section) => [
      section,
      catalog.filter((entry) => entry.section === section).length,
    ]),
  ) as Record<(typeof sectionOrder)[number], number>;
  const demos = catalog.filter((entry) => entry.demo).length;

  return (
    <div className="stack home">
      <header className="hero">
        <p className="eyebrow">React Hooks Playground</p>
        <h1>From fundamentals to advanced production patterns</h1>
        <p className="lead">
          A searchable, interactive reference for React hooks. Every page runs a live demo, shows
          the exact source that runs it and the tests that verify it, and explains when <em>not</em>{' '}
          to use the pattern.
        </p>
        <div className="row">
          <a className="btn btn-primary" href={href('/browse', { section: 'built-in' })}>
            Start with built-in hooks
          </a>
          <a className="btn" href={href('/learn')}>
            Follow the learning path
          </a>
          <a className="btn" href={href('/browse', { section: 'esp' })}>
            See the esp-js integration
          </a>
        </div>
        <p className="small muted">
          {catalog.length} topics · {demos} live demos · {completed.length} marked as learned in
          this browser
        </p>
      </header>

      <ul className="section-grid">
        {sectionOrder.map((section) => (
          <li key={section} className="card section-card">
            <h2>
              <a href={href('/browse', { section })}>{sectionLabels[section]}</a>
            </h2>
            <p>{sectionBlurbs[section]}</p>
            <Badge>{counts[section]} topics</Badge>
          </li>
        ))}
      </ul>

      <section className="card" aria-labelledby="about-heading">
        <h2 id="about-heading">Where this came from</h2>
        <p>
          This repository started as an example of wrapping{' '}
          <a href="https://github.com/esp/esp-js" target="_blank" rel="noreferrer">
            esp-js
          </a>{' '}
          in middleware so React function components could take part in an event-routed workspace.
          That example still runs here — migrated to React 19 and esp-js 8 — and the rest of the
          playground grew around it.
        </p>
        <p className="small muted">
          Network demos use a mocked API served in your browser by Mock Service Worker. No data
          leaves the page.
        </p>
      </section>
    </div>
  );
}
