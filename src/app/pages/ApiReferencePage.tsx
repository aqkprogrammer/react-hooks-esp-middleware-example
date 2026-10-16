import { catalog } from '../../catalog';
import { CodeBlock } from '../components/CodeBlock';
import { md } from '../markdown';
import { href } from '../router';

/** Signatures of every public custom hook, grouped by category. */
export function ApiReferencePage() {
  const hooks = catalog.filter((entry) => entry.section === 'custom' && entry.api);
  const categories = [...new Set(hooks.map((entry) => entry.category))];
  return (
    <div className="stack">
      <header className="page-header">
        <h1>API reference</h1>
        <p className="muted">
          {hooks.length} custom hooks exported from <code>src/hooks</code>. Import them from{' '}
          <code>src/hooks</code> (or copy the file — each hook only depends on React and small
          internal helpers).
        </p>
      </header>
      <nav aria-label="Categories" className="row">
        {categories.map((category) => (
          <a
            key={category}
            href={`#/api?c=${encodeURIComponent(category)}`}
            onClick={(event) => {
              event.preventDefault();
              document.getElementById(`api-${category}`)?.scrollIntoView();
            }}
          >
            {category}
          </a>
        ))}
      </nav>
      {categories.map((category) => (
        <section
          key={category}
          id={`api-${category}`}
          className="stack"
          aria-labelledby={`api-h-${category}`}
        >
          <h2 id={`api-h-${category}`}>{category}</h2>
          {hooks
            .filter((entry) => entry.category === category)
            .map((entry) => (
              <div key={entry.id} className="card stack api-item">
                <h3>
                  <a href={href(`/entry/${entry.id}`)}>{entry.title}</a>
                </h3>
                <p>{md(entry.summary)}</p>
                {entry.api ? <CodeBlock code={entry.api.signature} lineNumbers={false} /> : null}
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
