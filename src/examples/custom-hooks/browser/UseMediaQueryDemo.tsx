import { Badge, Callout, ValueTable } from '../../../components/ui';
import { useMediaQuery } from '../../../hooks';

const queries = {
  'Viewport ≥ 768px': '(min-width: 768px)',
  'Landscape orientation': '(orientation: landscape)',
  'Prefers dark color scheme': '(prefers-color-scheme: dark)',
  'Prefers reduced motion': '(prefers-reduced-motion: reduce)',
  'Fine pointer (mouse)': '(pointer: fine)',
  'Hover capable': '(hover: hover)',
} as const;

export default function UseMediaQueryDemo() {
  return (
    <div className="stack">
      <p>Resize the window or change your OS settings — each row updates live.</p>
      <ValueTable
        label="Media query results"
        rows={Object.fromEntries(
          Object.entries(queries).map(([label, query]) => [
            label,
            <MatchBadge key={label} query={query} />,
          ]),
        )}
      />
      <Callout title="Prefer CSS when you only need styling">
        If a media query only changes appearance, a CSS <code>@media</code> rule is cheaper and
        works before JavaScript loads. Use the hook when <em>behaviour</em> must change (e.g. render
        a different component tree).
      </Callout>
    </div>
  );
}

function MatchBadge({ query }: { query: string }) {
  const matches = useMediaQuery(query);
  return (
    <>
      <code>{query}</code>{' '}
      <Badge tone={matches ? 'success' : 'neutral'}>{matches ? 'matches' : 'no match'}</Badge>
    </>
  );
}
