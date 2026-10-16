import { useId, useRef, useState, useSyncExternalStore } from 'react';
import { EventLog, Panel, useEventLog } from '../../../components/ui';
import {
  formatShortcut,
  isApplePlatform,
  useDisclosure,
  useKeyboardShortcut,
} from '../../../hooks';
import './UseKeyboardShortcutDemo.css';

const ITEMS = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Spam'];

const noopSubscribe = () => () => {};
/** Platform never changes; `false` on the server avoids a hydration mismatch. */
function useIsApple() {
  return useSyncExternalStore(noopSubscribe, isApplePlatform, () => false);
}

/** A cheat sheet whose shortcuts all work, with platform-aware labels. */
export default function UseKeyboardShortcutDemo() {
  const apple = useIsApple();
  const [singleKey, setSingleKey] = useState(true);
  const [selected, setSelected] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const sheet = useDisclosure({ defaultOpen: true });
  const { entries, log, clear } = useEventLog();
  const captionId = useId();
  const searchId = useId();

  useKeyboardShortcut(
    'mod+k',
    () => {
      searchRef.current?.focus();
      log('mod+k → focus search');
    },
    { allowInInputs: true },
  );
  useKeyboardShortcut('shift+?', () => {
    sheet.toggle();
    log('shift+? → toggle cheat sheet');
  });
  useKeyboardShortcut(
    ['j', 'k'],
    (_event, shortcut) => {
      setSelected((index) =>
        shortcut === 'j' ? Math.min(ITEMS.length - 1, index + 1) : Math.max(0, index - 1),
      );
      log(`${shortcut} → ${shortcut === 'j' ? 'next' : 'previous'} folder`);
    },
    // Single-character shortcuts must be switchable off (WCAG 2.1.4).
    { enabled: singleKey, allowRepeat: true },
  );

  const shortcuts: Array<[string, string]> = [
    ['mod+k', 'Focus the search box (also works while typing)'],
    ['shift+?', 'Show or hide this cheat sheet'],
    ['j', 'Next folder'],
    ['k', 'Previous folder'],
  ];

  return (
    <div className="stack">
      <Panel title="Mailbox">
        <div className="field">
          <label htmlFor={searchId} className="field-label">
            Search mail
          </label>
          <input ref={searchRef} id={searchId} className="input" type="search" />
        </div>
        <ul className="list" aria-label="Folders">
          {ITEMS.map((item, index) => (
            <li
              key={item}
              aria-current={index === selected ? 'true' : undefined}
              className={index === selected ? 'active' : undefined}
            >
              {item}
            </li>
          ))}
        </ul>
        <label className="row">
          <input
            type="checkbox"
            checked={singleKey}
            onChange={(event) => setSingleKey(event.target.checked)}
          />
          Enable single-key shortcuts (j / k)
        </label>
      </Panel>
      <Panel title="Keyboard shortcuts">
        <button type="button" className="btn btn-sm" {...sheet.triggerProps}>
          {sheet.isOpen ? 'Hide' : 'Show'} cheat sheet
        </button>
        <div {...sheet.panelProps}>
          <table className="shortcuts-demo-table" aria-labelledby={captionId}>
            <caption id={captionId} className="visually-hidden">
              Keyboard shortcuts
            </caption>
            <thead>
              <tr>
                <th scope="col">Keys</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map(([combo, action]) => (
                <tr key={combo}>
                  <td>
                    <kbd className="kbd">{formatShortcut(combo, { apple })}</kbd>
                  </td>
                  <td>
                    {action}
                    {!singleKey && combo.length === 1 ? (
                      <span className="muted"> (off)</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <EventLog entries={entries} onClear={clear} title="Shortcut log" />
    </div>
  );
}
