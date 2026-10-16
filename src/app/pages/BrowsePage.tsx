import { useDeferredValue, useId, useMemo } from 'react';
import { catalog, sectionLabels, sectionOrder, type Level, type Section } from '../../catalog';
import { Button } from '../../components/ui';
import { EntryCard } from '../components/EntryCard';
import { useProgress } from '../preferences';
import { replace, type Location } from '../router';
import { searchCatalog } from '../search';

const levels: readonly Level[] = ['beginner', 'intermediate', 'advanced'];

const isSection = (value: string | null): value is Section =>
  value !== null && (sectionOrder as readonly string[]).includes(value);
const isLevel = (value: string | null): value is Level =>
  value !== null && (levels as readonly string[]).includes(value);

/** Searchable, filterable catalog. Filters live in the URL so results are shareable. */
export function BrowsePage({ location }: { location: Location }) {
  const { params } = location;
  const query = params.get('q') ?? '';
  const sectionParam = params.get('section');
  const levelParam = params.get('level');
  const section = isSection(sectionParam) ? sectionParam : undefined;
  const level = isLevel(levelParam) ? levelParam : undefined;
  const category = params.get('category') ?? undefined;
  const { completed } = useProgress();
  const ids = { search: useId(), section: useId(), category: useId(), level: useId() };

  // Typing stays responsive: filtering re-runs at lower priority.
  const deferredQuery = useDeferredValue(query);

  const update = (changes: Record<string, string | undefined>) => {
    const next: Record<string, string | undefined> = {
      q: query || undefined,
      section,
      category,
      level,
      ...changes,
    };
    replace('/browse', next);
  };

  const inSection = useMemo(
    () => (section ? catalog.filter((entry) => entry.section === section) : catalog),
    [section],
  );
  const categories = useMemo(
    () => [...new Set(inSection.map((entry) => entry.category))].sort(),
    [inSection],
  );
  const results = useMemo(
    () =>
      searchCatalog(deferredQuery, inSection).filter(
        (entry) => (!category || entry.category === category) && (!level || entry.level === level),
      ),
    [deferredQuery, inSection, category, level],
  );
  const stale = deferredQuery !== query;
  const heading = section ? sectionLabels[section] : 'All topics';

  return (
    <div className="stack">
      <header className="page-header">
        <h1>{heading}</h1>
        <p className="muted">
          Search by hook name, category or use case (e.g. “debounce”, “focus”, “race condition”).
        </p>
      </header>
      <form className="filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="field">
          <label className="field-label" htmlFor={ids.search}>
            Search
          </label>
          <input
            id={ids.search}
            className="input"
            type="search"
            value={query}
            placeholder="useDebounce, websocket, a11y…"
            onChange={(event) => update({ q: event.target.value || undefined })}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={ids.section}>
            Section
          </label>
          <select
            id={ids.section}
            value={section ?? ''}
            onChange={(event) =>
              update({ section: event.target.value || undefined, category: undefined })
            }
          >
            <option value="">All sections</option>
            {sectionOrder.map((value) => (
              <option key={value} value={value}>
                {sectionLabels[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={ids.category}>
            Category
          </label>
          <select
            id={ids.category}
            value={category ?? ''}
            onChange={(event) => update({ category: event.target.value || undefined })}
          >
            <option value="">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={ids.level}>
            Level
          </label>
          <select
            id={ids.level}
            value={level ?? ''}
            onChange={(event) => update({ level: event.target.value || undefined })}
          >
            <option value="">All levels</option>
            {levels.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="field filters-reset">
          <Button
            onClick={() => replace('/browse', section ? { section } : {})}
            disabled={!query && !category && !level}
          >
            Clear filters
          </Button>
        </div>
      </form>
      <p className="muted small" role="status">
        {results.length} {results.length === 1 ? 'result' : 'results'}
      </p>
      <ul className="entry-grid" style={{ opacity: stale ? 0.6 : 1 }}>
        {results.map((entry) => (
          <EntryCard key={entry.id} entry={entry} done={completed.includes(entry.id)} />
        ))}
      </ul>
      {results.length === 0 ? <p>No matches. Try fewer words or clear the filters.</p> : null}
    </div>
  );
}
