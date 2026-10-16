import { useState } from 'react';
import { Callout, EventLog, Panel, useEventLog } from '../../../components/ui';
import { LanguageCombobox } from './LanguageCombobox';
import './AutocompleteScenario.css';

/**
 * An accessible autocomplete: the WAI-ARIA APG combobox pattern (list
 * autocomplete, manual selection) fed by debounced, race-safe requests to
 * `/api/search`, with result counts announced through `useAnnouncer`.
 */
export default function AutocompleteScenario() {
  const [chosen, setChosen] = useState<string[]>([]);
  const { entries, log, clear } = useEventLog(20);

  return (
    <div className="stack">
      <Panel
        title="Pick your languages"
        description="Suggestions come from the mocked /api/search, which answers shorter queries more slowly — a stale response can never replace a newer one. Type “error” to see the failure state."
      >
        <LanguageCombobox
          label="Programming language"
          onSelect={(language) => {
            setChosen((previous) =>
              previous.includes(language) ? previous : [...previous, language],
            );
            log(`selected ${language}`, 'success');
          }}
        />
        <div className="stack">
          <h4 className="autocomplete-chosen-title">Chosen languages</h4>
          {chosen.length === 0 ? (
            <p className="muted small">Nothing chosen yet.</p>
          ) : (
            <ul className="row autocomplete-chosen" aria-label="Chosen languages">
              {chosen.map((language) => (
                <li key={language} className="badge badge-info">
                  {language}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
      <Callout title="Why aria-activedescendant?">
        DOM focus never leaves the text box, so typing keeps working while the arrow keys move a
        “virtual” focus through the options. Screen readers follow{' '}
        <code>aria-activedescendant</code> and read the highlighted option; the result count is
        announced once the debounced request settles, not on every keystroke.
      </Callout>
      <EventLog entries={entries} onClear={clear} />
    </div>
  );
}
