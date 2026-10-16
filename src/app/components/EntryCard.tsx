import type { CatalogEntry } from '../../catalog';
import { sectionLabels } from '../../catalog';
import { Badge } from '../../components/ui';
import { href } from '../router';

export function LevelBadge({ level }: { level: CatalogEntry['level'] }) {
  return <Badge tone={level}>{level}</Badge>;
}

export function EntryCard({ entry, done }: { entry: CatalogEntry; done?: boolean }) {
  return (
    <li className="entry-card">
      <h3 className="entry-card-title">
        <a href={href(`/entry/${entry.id}`)}>{entry.title}</a>
      </h3>
      <p className="entry-card-summary">{entry.summary}</p>
      <div className="row small">
        <LevelBadge level={entry.level} />
        <Badge title="Minimum React version">React {entry.minReact}+</Badge>
        <span className="muted">
          {sectionLabels[entry.section]} · {entry.category}
        </span>
        {entry.demo ? <Badge tone="info">live demo</Badge> : null}
        {done ? <Badge tone="success">✓ learned</Badge> : null}
      </div>
    </li>
  );
}
