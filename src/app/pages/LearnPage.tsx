import { catalog, sectionOrder, type CatalogEntry, type Level } from '../../catalog';
import { Button } from '../../components/ui';
import { useProgress } from '../preferences';
import { href } from '../router';

const steps: Array<{ level: Level; title: string; description: string }> = [
  {
    level: 'beginner',
    title: '1. Foundations',
    description: 'State, effects, refs and the Rules of Hooks.',
  },
  {
    level: 'intermediate',
    title: '2. Building blocks',
    description: 'Custom hooks, performance, forms, browser APIs and data fetching.',
  },
  {
    level: 'advanced',
    title: '3. Production patterns',
    description:
      'Concurrent rendering, external stores, middleware, esp-js and complete scenarios.',
  },
];

const order = (entry: CatalogEntry) => sectionOrder.indexOf(entry.section);

/** A progress view over the catalog, grouped by level. Progress is stored in this browser only. */
export function LearnPage() {
  const { completed, toggle, reset } = useProgress();
  const total = catalog.length;
  const done = catalog.filter((entry) => completed.includes(entry.id)).length;

  return (
    <div className="stack">
      <header className="page-header">
        <h1>Learning path</h1>
        <p className="muted">
          Work through the levels in order. Mark topics as learned on each page or here — progress
          is saved in this browser’s localStorage.
        </p>
        <label className="small" htmlFor="overall-progress">
          Overall progress: {done} / {total}
        </label>
        <progress id="overall-progress" className="progress" max={total} value={done} />
        <div className="row">
          <Button variant="danger" size="sm" onClick={reset} disabled={done === 0}>
            Reset progress
          </Button>
        </div>
      </header>
      {steps.map((step) => {
        const entries = catalog
          .filter((entry) => entry.level === step.level)
          .sort((a, b) => order(a) - order(b));
        const stepDone = entries.filter((entry) => completed.includes(entry.id)).length;
        return (
          <section key={step.level} className="card stack" aria-labelledby={`step-${step.level}`}>
            <div className="spread">
              <h2 id={`step-${step.level}`}>{step.title}</h2>
              <span className="small muted">
                {stepDone} / {entries.length}
              </span>
            </div>
            <p>{step.description}</p>
            <ul className="checklist">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <input
                    type="checkbox"
                    id={`learn-${entry.id}`}
                    checked={completed.includes(entry.id)}
                    onChange={() => toggle(entry.id)}
                  />
                  <label htmlFor={`learn-${entry.id}`} className="visually-hidden">
                    Mark {entry.title} as learned
                  </label>
                  <a href={href(`/entry/${entry.id}`)}>{entry.title}</a>
                  <span className="muted small"> — {entry.category}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
