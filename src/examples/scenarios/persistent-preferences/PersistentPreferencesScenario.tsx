import { useId, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Button, Callout, Panel } from '../../../components/ui';
import { usePersistentState, type PersistentStateError } from '../../../hooks';
import {
  DEFAULT_PREFERENCES,
  DENSITIES,
  DIGESTS,
  FONT_SIZE,
  isPreferences,
  LANGUAGES,
  migratePreferences,
  PREFERENCES_KEY,
  PREFERENCES_VERSION,
  V1_SAMPLE,
  type Density,
  type Digest,
  type Language,
  type Preferences,
} from './preferences';
import {
  preferencesAdapter,
  readRawPreferences,
  subscribeRawPreferences,
  writeRawPreferences,
} from './preferencesStorage';
import './PersistentPreferencesScenario.css';

const DENSITY_LABELS: Record<Density, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  spacious: 'Spacious',
};
const DIGEST_LABELS: Record<Digest, string> = { off: 'Off', daily: 'Daily', weekly: 'Weekly' };

function describeError(error: PersistentStateError): string {
  switch (error.kind) {
    case 'version':
      return 'The stored preferences were written by a newer version of the app. Defaults are shown; the stored data is left alone until you change a setting.';
    case 'migrate':
      return 'The stored preferences could not be migrated, so the defaults are shown.';
    case 'invalid':
    case 'parse':
      return 'The stored preferences are invalid, so the defaults are shown.';
    case 'write':
    case 'serialize':
    case 'unavailable':
      return 'Preferences could not be saved (storage is full or blocked).';
  }
}

/**
 * A settings form persisted with `usePersistentState`: versioned storage
 * envelope, v1 → v2 migration on read, validation, cross-tab sync and reset.
 */
export default function PersistentPreferencesScenario() {
  const ids = useId();
  const [error, setError] = useState<PersistentStateError | null>(null);
  const [notice, setNotice] = useState('');
  const [prefs, setPrefs, resetPrefs] = usePersistentState<Preferences>(
    PREFERENCES_KEY,
    DEFAULT_PREFERENCES,
    {
      adapter: preferencesAdapter,
      version: PREFERENCES_VERSION,
      migrate: migratePreferences,
      validate: isPreferences,
      onError: setError,
    },
  );
  const raw = useSyncExternalStore(subscribeRawPreferences, readRawPreferences, () => null);

  const update = (patch: Partial<Preferences>) => {
    setError(null);
    setPrefs((previous) => ({ ...previous, ...patch }));
  };
  const updateNotifications = (patch: Partial<Preferences['notifications']>) => {
    setError(null);
    setPrefs((previous) => ({
      ...previous,
      notifications: { ...previous.notifications, ...patch },
    }));
  };

  const seed = (rawValue: string, message: string) => {
    setError(null);
    writeRawPreferences(rawValue);
    setNotice(message);
  };

  const language = LANGUAGES.find((option) => option.code === prefs.language) ?? LANGUAGES[0];

  return (
    <div className="stack">
      <div className="persistent-preferences-layout">
        <Panel title="Preferences" description="Changes are saved as you make them.">
          <form className="stack" onSubmit={(event) => event.preventDefault()}>
            <div className="field">
              <label className="field-label" htmlFor={`${ids}-font`}>
                Font size
              </label>
              <div className="row">
                <input
                  id={`${ids}-font`}
                  type="range"
                  min={FONT_SIZE.min}
                  max={FONT_SIZE.max}
                  step={1}
                  value={prefs.fontSizePx}
                  aria-valuetext={`${prefs.fontSizePx} pixels`}
                  onChange={(event) => update({ fontSizePx: Number(event.target.value) })}
                />
                {/* The slider's aria-valuetext already speaks the value; avoid a second live region. */}
                <output htmlFor={`${ids}-font`} className="mono" aria-hidden="true">
                  {prefs.fontSizePx}px
                </output>
              </div>
            </div>

            <fieldset className="persistent-preferences-fieldset">
              <legend className="field-label">Density</legend>
              <div className="row">
                {DENSITIES.map((density) => (
                  <label key={density} className="row">
                    <input
                      type="radio"
                      name={`${ids}-density`}
                      checked={prefs.density === density}
                      onChange={() => update({ density })}
                    />
                    {DENSITY_LABELS[density]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label className="field-label" htmlFor={`${ids}-language`}>
                Language
              </label>
              <select
                id={`${ids}-language`}
                value={prefs.language}
                onChange={(event) => update({ language: event.target.value as Language })}
              >
                {LANGUAGES.map((option) => (
                  <option key={option.code} value={option.code} lang={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="persistent-preferences-fieldset">
              <legend className="field-label">Notifications</legend>
              <div className="stack">
                <label className="row">
                  <input
                    type="checkbox"
                    checked={prefs.notifications.email}
                    onChange={(event) => updateNotifications({ email: event.target.checked })}
                  />
                  Email notifications
                </label>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={prefs.notifications.push}
                    onChange={(event) => updateNotifications({ push: event.target.checked })}
                  />
                  Push notifications
                </label>
                <div className="field">
                  <label className="field-label" htmlFor={`${ids}-digest`}>
                    Email digest
                  </label>
                  <select
                    id={`${ids}-digest`}
                    value={prefs.notifications.digest}
                    disabled={!prefs.notifications.email}
                    onChange={(event) =>
                      updateNotifications({ digest: event.target.value as Digest })
                    }
                  >
                    {DIGESTS.map((digest) => (
                      <option key={digest} value={digest}>
                        {DIGEST_LABELS[digest]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            <div>
              <Button
                variant="danger"
                onClick={() => {
                  setError(null);
                  resetPrefs();
                  setNotice('Preferences reset to the defaults.');
                }}
              >
                Reset to defaults
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Preview">
          <div
            className="persistent-preferences-preview"
            data-density={prefs.density}
            lang={language.code}
            style={
              { '--persistent-preferences-font-size': `${prefs.fontSizePx}px` } as CSSProperties
            }
          >
            <p className="persistent-preferences-greeting">{language.greeting}</p>
            <ul className="persistent-preferences-items">
              <li>Inbox</li>
              <li>Drafts</li>
              <li>Archive</li>
            </ul>
            <p className="muted small" lang="en">
              Email{' '}
              {prefs.notifications.email ? `on (digest: ${prefs.notifications.digest})` : 'off'} ·
              push {prefs.notifications.push ? 'on' : 'off'}
            </p>
          </div>
        </Panel>
      </div>

      {error ? (
        <Callout tone="warn" title={`Storage problem: ${error.kind}`}>
          {describeError(error)}
        </Callout>
      ) : null}
      <p role="status" className="persistent-preferences-notice">
        {notice}
      </p>

      <Panel
        title="Schema versions"
        description="Write what other releases would have stored and watch the hook handle it."
      >
        <div className="row">
          <Button
            onClick={() =>
              seed(
                JSON.stringify({ __v: 1, value: V1_SAMPLE }),
                'Wrote a version 1 record. It was migrated to version 2 on read and written back.',
              )
            }
          >
            Seed old v1 data
          </Button>
          <Button
            onClick={() =>
              seed(
                JSON.stringify({ __v: 3, value: { theme: 'from the future' } }),
                'Wrote a version 3 record from a newer release.',
              )
            }
          >
            Seed future v3 data
          </Button>
          <Button onClick={() => seed('{not json', 'Wrote a corrupt record.')}>
            Write corrupt data
          </Button>
        </div>
        <div className="field">
          <span className="field-label" id={`${ids}-raw`}>
            Stored in localStorage[“{PREFERENCES_KEY}”]
          </span>
          <pre
            className="persistent-preferences-raw mono small"
            aria-labelledby={`${ids}-raw`}
            role="region"
            tabIndex={0}
          >
            {raw === null ? '(nothing stored — defaults in use)' : formatRaw(raw)}
          </pre>
        </div>
      </Panel>
    </div>
  );
}

function formatRaw(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
