import { useMemo, useState } from 'react';
import { Badge, Panel, TextField, ValueTable, show } from '../../../components/ui';
import { useDebounce } from '../../../hooks';

const LANGUAGES = [
  'Ada',
  'Bash',
  'C',
  'C#',
  'C++',
  'Clojure',
  'COBOL',
  'Dart',
  'Elixir',
  'Elm',
  'Erlang',
  'F#',
  'Fortran',
  'Go',
  'Haskell',
  'Java',
  'JavaScript',
  'Julia',
  'Kotlin',
  'Lisp',
  'Lua',
  'OCaml',
  'Perl',
  'PHP',
  'Python',
  'R',
  'Ruby',
  'Rust',
  'Scala',
  'Swift',
  'TypeScript',
  'Zig',
];

const DELAYS = [150, 300, 600, 1000];

/**
 * The input stays instant (raw value) while the "expensive" search only runs
 * for the debounced value. Searches are counted with the "adjust state while
 * rendering" pattern — no Effect needed.
 */
export default function UseDebounceDemo() {
  const [query, setQuery] = useState('');
  const [delay, setDelay] = useState(300);
  const [keystrokes, setKeystrokes] = useState(0);
  const debouncedQuery = useDebounce(query, delay);

  const [searched, setSearched] = useState({ query: debouncedQuery, count: 0 });
  if (searched.query !== debouncedQuery) {
    setSearched({ query: debouncedQuery, count: searched.count + 1 });
  }

  const results = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return needle ? LANGUAGES.filter((name) => name.toLowerCase().includes(needle)) : [];
  }, [debouncedQuery]);

  const waiting = query !== debouncedQuery;

  return (
    <div className="stack">
      <Panel title="Search" description="Type quickly: the search runs once you pause.">
        <div className="row">
          <TextField
            label="Search languages"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setKeystrokes((n) => n + 1);
            }}
          />
          <label className="field">
            <span className="field-label">Delay</span>
            <select
              className="input"
              value={delay}
              onChange={(event) => setDelay(Number(event.target.value))}
            >
              {DELAYS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms} ms
                </option>
              ))}
            </select>
          </label>
        </div>
        <ValueTable
          label="Values"
          rows={{
            'Raw value': show(query),
            'Debounced value': show(debouncedQuery),
            Status: (
              <Badge tone={waiting ? 'warn' : 'success'}>{waiting ? 'waiting…' : 'settled'}</Badge>
            ),
            Keystrokes: keystrokes,
            'Searches run': searched.count,
          }}
        />
        <ul className="list" aria-label="Results">
          {results.length === 0 ? (
            <li className="muted">{debouncedQuery ? 'No matches.' : 'Start typing.'}</li>
          ) : null}
          {results.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
