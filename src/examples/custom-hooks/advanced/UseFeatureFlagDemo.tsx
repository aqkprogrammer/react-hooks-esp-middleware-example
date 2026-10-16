import { useCallback, useId, useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import {
  FeatureFlagProvider,
  defineFeatureFlags,
  useFeatureFlag,
  useFeatureFlags,
  type FlagSource,
} from '../../../hooks/advanced';

type SearchMode = 'exact' | 'prefix' | 'fuzzy';
const searchModes: readonly SearchMode[] = ['exact', 'prefix', 'fuzzy'];

/** Declared once: names, types and safe defaults (used on the server and before loading). */
const demoFlags = defineFeatureFlags<{
  newCheckout: boolean;
  searchMode: SearchMode;
  maxUploadMb: number;
}>(
  { newCheckout: false, searchMode: 'exact', maxUploadMb: 10 },
  { storageKey: 'playground:feature-flag-overrides' },
);

const sourceTone: Record<FlagSource, 'neutral' | 'info' | 'warn'> = {
  default: 'neutral',
  remote: 'info',
  override: 'warn',
};

/** Product code only asks for the flag it needs — typed by the definition. */
function Checkout() {
  const newCheckout = useFeatureFlag(demoFlags, 'newCheckout');
  const maxUploadMb = useFeatureFlag(demoFlags, 'maxUploadMb');
  return (
    <div className="card stack">
      <strong>{newCheckout ? 'New one-page checkout' : 'Classic three-step checkout'}</strong>
      <span className="small muted">Receipts up to {maxUploadMb} MB can be attached.</span>
    </div>
  );
}

function SearchBox() {
  const mode = useFeatureFlag(demoFlags, 'searchMode');
  return (
    <p>
      Search mode in use: <code>{mode}</code>
    </p>
  );
}

/** Developer panel: sources and local overrides. */
function FlagPanel() {
  const ids = { checkout: useId(), mode: useId(), upload: useId() };
  const { flags, sourceOf, status, error, setOverride, clearOverrides, refresh } =
    useFeatureFlags(demoFlags);
  const source = (name: keyof typeof flags & string) => (
    <Badge tone={sourceTone[sourceOf(name)]}>{sourceOf(name)}</Badge>
  );

  return (
    <div className="stack">
      <div className="row">
        <span>
          Remote flags: <Badge tone={status === 'error' ? 'warn' : 'info'}>{status}</Badge>
        </span>
        <Button size="sm" onClick={refresh} disabled={status === 'loading'}>
          Reload remote flags
        </Button>
        <Button size="sm" variant="danger" onClick={clearOverrides}>
          Clear local overrides
        </Button>
      </div>
      {error ? (
        <Callout tone="warn" title="Remote flags unavailable">
          {error.message} — falling back to defaults (and any overrides).
        </Callout>
      ) : null}
      <ul className="list">
        <li className="spread">
          <label className="row" htmlFor={ids.checkout}>
            <input
              id={ids.checkout}
              type="checkbox"
              checked={flags.newCheckout}
              onChange={(event) => setOverride('newCheckout', event.target.checked)}
            />
            newCheckout
          </label>
          {source('newCheckout')}
        </li>
        <li className="spread">
          <label className="row" htmlFor={ids.mode}>
            searchMode
            <select
              id={ids.mode}
              value={flags.searchMode}
              onChange={(event) => setOverride('searchMode', event.target.value as SearchMode)}
            >
              {searchModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          {source('searchMode')}
        </li>
        <li className="spread">
          <label className="row" htmlFor={ids.upload}>
            maxUploadMb
            <input
              id={ids.upload}
              className="input"
              type="number"
              min={1}
              max={100}
              value={flags.maxUploadMb}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value > 0) setOverride('maxUploadMb', value);
              }}
            />
          </label>
          {source('maxUploadMb')}
        </li>
      </ul>
    </div>
  );
}

export default function UseFeatureFlagDemo() {
  const [simulateOutage, setSimulateOutage] = useState(false);
  // Stable per setting: changing it re-runs the remote load.
  const load = useCallback(
    async (signal: AbortSignal) => {
      const response = await fetch(`/api/feature-flags${simulateOutage ? '?fail=1' : ''}`, {
        signal,
      });
      if (!response.ok) throw new Error(`Flag service responded ${response.status}`);
      return (await response.json()) as unknown;
    },
    [simulateOutage],
  );

  return (
    <FeatureFlagProvider definition={demoFlags} load={load}>
      <div className="stack">
        <Panel title="The app" description="Components read single, typed flags.">
          <Checkout />
          <SearchBox />
        </Panel>
        <Panel
          title="Flag panel"
          description="Precedence: local override → remote → default. Overrides persist in localStorage for this browser only."
        >
          <label className="row">
            <input
              type="checkbox"
              checked={simulateOutage}
              onChange={(event) => setSimulateOutage(event.target.checked)}
            />
            Simulate a flag-service outage
          </label>
          <FlagPanel />
        </Panel>
      </div>
    </FeatureFlagProvider>
  );
}
