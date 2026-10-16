import { useState } from 'react';
import { Callout, EventLog, Panel, useEventLog } from '../../../components/ui';
import { INITIAL_FILES, sortFiles, type FileEntry } from './menuModel';
import { ViewOptionsMenu, type ViewSettings } from './ViewOptionsMenu';
import './DropdownMenuScenario.css';

const formatSize = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

/**
 * A file browser whose "View options" menu follows the WAI-ARIA APG menu
 * button pattern: actions, check items and a radio group, arrow keys via
 * `useRovingTabIndex`, first-letter typeahead, Escape/Tab/click-outside
 * (`useClickOutside`) to close, and focus returned to the button.
 */
export default function DropdownMenuScenario() {
  const [files, setFiles] = useState<FileEntry[]>(() => [...INITIAL_FILES]);
  const [settings, setSettings] = useState<ViewSettings>({
    showHidden: false,
    showSizes: true,
    sortBy: 'name',
  });
  const { entries, log, clear } = useEventLog(20);

  const shown = sortFiles(
    files.filter((file) => settings.showHidden || !file.name.startsWith('.')),
    settings.sortBy,
  );

  return (
    <div className="stack">
      <Panel
        title="Project files"
        description="Open the menu with Enter, Space, ↓ or ↑. Type a letter to jump to an item; Space toggles check and radio items without closing the menu."
      >
        <div className="spread">
          <ViewOptionsMenu
            settings={settings}
            onSettingsChange={(next) => {
              setSettings(next);
              log(
                `view: hidden ${next.showHidden ? 'shown' : 'hidden'}, sizes ${next.showSizes ? 'on' : 'off'}, sorted by ${next.sortBy}`,
              );
            }}
            onAction={(action) => {
              if (action === 'new-folder') {
                const name = `New folder ${files.filter((file) => file.name.startsWith('New folder')).length + 1}`;
                setFiles((previous) => [...previous, { name, sizeKb: 0, modified: '2026-10-16' }]);
                log(`created “${name}”`, 'success');
              } else {
                log('refreshed the file list');
              }
            }}
          />
          <span className="muted small">
            {shown.length} {shown.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <ul className="list" aria-label="Files">
          {shown.map((file) => (
            <li key={file.name} className="spread">
              <span className="mono">{file.name}</span>
              <span className="muted small">
                {settings.showSizes ? `${formatSize(file.sizeKb)} · ` : ''}
                {file.modified}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <Callout title="Menu button vs. disclosure">
        Use <code>role="menu"</code> only for application-style command menus like this one. A
        navigation drop-down of links is a <em>disclosure</em> (<code>useDisclosure</code>) — menu
        semantics would change how screen readers and keyboards treat it.
      </Callout>
      <EventLog entries={entries} onClear={clear} />
    </div>
  );
}
