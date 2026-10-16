import type { ReactNode } from 'react';
import { catalog, getEntry, sectionLabels, type CatalogEntry } from '../../catalog';
import { Badge, Button, Callout } from '../../components/ui';
import { CodeBlock } from '../components/CodeBlock';
import { DemoFrame } from '../components/DemoFrame';
import { Diagram } from '../components/Diagram';
import { LevelBadge } from '../components/EntryCard';
import { SourceViewer } from '../components/SourceViewer';
import { md } from '../markdown';
import { useProgress } from '../preferences';
import { href } from '../router';
import { NotFoundPage } from './NotFoundPage';

const supportLabels = {
  universal: 'Works everywhere',
  'browser-limited': 'Browser support varies',
  'client-only': 'Client-only (SSR-safe)',
} as const;

export function EntryPage({ id }: { id: string }) {
  const entry = getEntry(id);
  const { completed, toggle } = useProgress();
  if (!entry) return <NotFoundPage />;
  const done = completed.includes(entry.id);
  const related = (entry.related ?? [])
    .map(getEntry)
    .filter((item): item is CatalogEntry => !!item);
  const index = catalog.indexOf(entry);
  const previous = catalog[index - 1];
  const next = catalog[index + 1];

  return (
    <article className="entry stack" aria-labelledby="entry-title">
      <nav aria-label="Breadcrumb" className="small">
        <a href={href('/browse', { section: entry.section })}>{sectionLabels[entry.section]}</a> ›{' '}
        <a href={href('/browse', { section: entry.section, category: entry.category })}>
          {entry.category}
        </a>
      </nav>
      <header className="page-header">
        <h1 id="entry-title">{entry.title}</h1>
        <p className="lead">{md(entry.summary)}</p>
        <div className="row">
          <LevelBadge level={entry.level} />
          <Badge title="Minimum React version">React {entry.minReact}+</Badge>
          {entry.support ? <Badge tone="warn">{supportLabels[entry.support.level]}</Badge> : null}
          <Button
            size="sm"
            variant={done ? 'secondary' : 'primary'}
            aria-pressed={done}
            onClick={() => toggle(entry.id)}
          >
            {done ? '✓ Learned' : 'Mark as learned'}
          </Button>
        </div>
      </header>

      <Section title="Concept">
        <p>{md(entry.concept)}</p>
      </Section>
      <Section title="Problem">
        <p>{md(entry.problem)}</p>
      </Section>

      {entry.demo ? <DemoFrame key={entry.id} path={entry.demo} title={entry.title} /> : null}

      {entry.whenToUse?.length || entry.whenNotToUse?.length ? (
        <div className="grid">
          {entry.whenToUse?.length ? (
            <Section title="When to use">
              <List items={entry.whenToUse} />
            </Section>
          ) : null}
          {entry.whenNotToUse?.length ? (
            <Section title="When not to use">
              <List items={entry.whenNotToUse} />
            </Section>
          ) : null}
        </div>
      ) : null}

      {entry.api ? (
        <Section title="API">
          <CodeBlock code={entry.api.signature} lineNumbers={false} />
          {entry.api.params?.length ? (
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Parameters">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Parameter</th>
                    <th scope="col">Type</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.api.params.map((param) => (
                    <tr key={param.name}>
                      <td>
                        <code>{param.name}</code>
                        {param.optional ? <span className="muted"> (optional)</span> : null}
                      </td>
                      <td>
                        <code>{param.type}</code>
                      </td>
                      <td>{md(param.description)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {entry.api.returns ? (
            <p>
              <strong>Returns:</strong> {md(entry.api.returns)}
            </p>
          ) : null}
        </Section>
      ) : null}

      <Section title="Implementation">
        <SourceViewer key={entry.id} files={entry.sources} />
      </Section>

      {entry.execution?.length ? (
        <Section title="Execution flow">
          <ol>
            {entry.execution.map((step) => (
              <li key={step}>{md(step)}</li>
            ))}
          </ol>
        </Section>
      ) : null}

      {entry.diagram ? <Diagram diagram={entry.diagram} /> : null}

      {entry.mistakes?.length ? (
        <Section title="Common mistakes">
          {entry.mistakes.map((mistake) => (
            <div key={mistake.title} className="mistake stack">
              <h3>{mistake.title}</h3>
              <CodeBlock code={mistake.wrong} label="✗ Incorrect" lineNumbers={false} />
              <p>{md(mistake.why)}</p>
              {mistake.right ? (
                <CodeBlock code={mistake.right} label="✓ Correct" lineNumbers={false} />
              ) : null}
            </div>
          ))}
        </Section>
      ) : null}

      {entry.edgeCases?.length ? (
        <Section title="Edge cases">
          <List items={entry.edgeCases} />
        </Section>
      ) : null}

      {entry.support?.notes ? (
        <Callout tone="warn" title="Browser support">
          {md(entry.support.notes)}
        </Callout>
      ) : null}

      {entry.testing || entry.tests?.length ? (
        <Section title="Testing">
          {entry.testing ? <p>{md(entry.testing)}</p> : null}
          {entry.tests?.length ? (
            <SourceViewer key={`${entry.id}-tests`} files={entry.tests} />
          ) : null}
        </Section>
      ) : null}

      {entry.production?.length ? (
        <Section title="Production considerations">
          <List items={entry.production} />
        </Section>
      ) : null}

      {related.length || entry.officialDocs?.length ? (
        <Section title="Related">
          <div className="grid">
            {related.length ? (
              <ul>
                {related.map((item) => (
                  <li key={item.id}>
                    <a href={href(`/entry/${item.id}`)}>{item.title}</a>
                  </li>
                ))}
              </ul>
            ) : null}
            {entry.officialDocs?.length ? (
              <ul>
                {entry.officialDocs.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Section>
      ) : null}

      <nav className="spread entry-pager" aria-label="Previous and next topics">
        {previous ? <a href={href(`/entry/${previous.id}`)}>← {previous.title}</a> : <span />}
        {next ? <a href={href(`/entry/${next.id}`)}>{next.title} →</a> : <span />}
      </nav>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="entry-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{md(item)}</li>
      ))}
    </ul>
  );
}
