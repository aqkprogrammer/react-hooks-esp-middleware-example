import { useId, useState } from 'react';
import {
  Button,
  Callout,
  EventLog,
  Panel,
  ValueTable,
  show,
  useEventLog,
} from '../../../components/ui';
import {
  createMemoryAdapter,
  usePersistentState,
  webStorageAdapter,
  type PersistenceAdapter,
  type PersistentStateError,
} from '../../../hooks';

const KEY = 'playground:prefs';

interface Prefs {
  theme: 'light' | 'dark';
  fontSize: number;
}

const DEFAULTS: Prefs = { theme: 'light', fontSize: 16 };

const isPrefs = (value: unknown): value is Prefs =>
  typeof value === 'object' &&
  value !== null &&
  ((value as Prefs).theme === 'light' || (value as Prefs).theme === 'dark') &&
  typeof (value as Prefs).fontSize === 'number';

/**
 * Schema history:
 * - v0: a bare string ("dark") written with `localStorage.setItem` by an old release.
 * - v1: `{ theme }`.
 * - v2 (current): `{ theme, fontSize }`.
 */
function migrate(old: unknown, fromVersion: number): unknown {
  const v1 = fromVersion === 0 ? { theme: old } : (old as { theme?: unknown });
  return { theme: v1.theme === 'dark' ? 'dark' : 'light', fontSize: 14 };
}

const adapters: Record<'local' | 'memory', PersistenceAdapter> = {
  local: webStorageAdapter('local'),
  memory: createMemoryAdapter(),
};

const seeds: Record<string, string> = {
  'v0 raw string': 'dark',
  'v1 envelope': JSON.stringify({ __v: 1, value: { theme: 'dark' } }),
  'v3 (newer release)': JSON.stringify({ __v: 3, value: { theme: 'dark', fontSize: 20, x: 1 } }),
  'corrupt v2': JSON.stringify({ __v: 2, value: { theme: 'purple' } }),
};

export default function UsePersistentStateDemo() {
  const [adapterName, setAdapterName] = useState<'local' | 'memory'>('local');
  // Remounting the editor simulates the app starting with whatever is stored.
  const [generation, setGeneration] = useState(0);
  const { entries, log, clear } = useEventLog();
  const adapterId = useId();
  const adapter = adapters[adapterName];

  return (
    <div className="stack">
      <Panel title="Storage adapter">
        <div className="field">
          <label className="field-label" htmlFor={adapterId}>
            Adapter
          </label>
          <select
            id={adapterId}
            className="input"
            value={adapterName}
            onChange={(event) => setAdapterName(event.target.value as 'local' | 'memory')}
          >
            <option value="local">localStorage (persists, syncs tabs)</option>
            <option value="memory">In-memory (lost on reload)</option>
          </select>
        </div>
      </Panel>
      <Panel
        title="Simulate data from other app versions"
        description="Writes raw data under the key, then restarts the component that reads it."
      >
        <div className="row">
          {Object.entries(seeds).map(([label, raw]) => (
            <Button
              key={label}
              onClick={() => {
                adapter.setItem(KEY, raw);
                log(`Seeded ${label}: ${raw}`);
                setGeneration((g) => g + 1);
              }}
            >
              Seed {label}
            </Button>
          ))}
        </div>
      </Panel>
      <PrefsEditor
        key={`${adapterName}-${generation}`}
        adapter={adapter}
        onError={(error) => log(`${error.kind}: ${show(error.error)}`, 'warn')}
      />
      <EventLog entries={entries} onClear={clear} />
      <Callout title="Compared with useLocalStorage">
        Same idea, plus a pluggable adapter and a versioned envelope. Older data is migrated once
        and written back; data from a newer version is ignored instead of misread.
      </Callout>
    </div>
  );
}

function PrefsEditor({
  adapter,
  onError,
}: {
  adapter: PersistenceAdapter;
  onError: (error: PersistentStateError) => void;
}) {
  const [prefs, setPrefs, removePrefs] = usePersistentState(KEY, DEFAULTS, {
    adapter,
    version: 2,
    migrate,
    validate: isPrefs,
    onError,
  });
  const [raw, setRaw] = useState(() => adapter.getItem(KEY));
  const readRaw = () => setRaw(adapter.getItem(KEY));

  return (
    <Panel title="Preferences (schema v2)">
      <ValueTable label="Preferences" rows={{ theme: prefs.theme, fontSize: prefs.fontSize }} />
      <div className="row">
        <Button
          onClick={() => {
            setPrefs((p) => ({ ...p, theme: p.theme === 'light' ? 'dark' : 'light' }));
            readRaw();
          }}
        >
          Toggle theme
        </Button>
        <Button
          onClick={() => {
            setPrefs((p) => ({ ...p, fontSize: p.fontSize + 1 }));
            readRaw();
          }}
        >
          Font size +1
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            removePrefs();
            readRaw();
          }}
        >
          Remove
        </Button>
        <Button variant="ghost" onClick={readRaw}>
          Re-read raw value
        </Button>
      </div>
      <ValueTable
        label="Raw stored value"
        rows={{ [KEY]: <span className="mono small">{raw ?? '(nothing stored)'}</span> }}
      />
    </Panel>
  );
}
