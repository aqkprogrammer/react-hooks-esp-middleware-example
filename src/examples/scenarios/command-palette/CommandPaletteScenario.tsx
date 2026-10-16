import { useMemo, useState } from 'react';
import { Callout, Panel, ValueTable } from '../../../components/ui';
import { useLocalStorage } from '../../../hooks';
import { CommandPalette } from './CommandPalette';
import { RECENT_KEY, isStringArray, type Command } from './commands';
import './CommandPaletteScenario.css';

type Density = 'comfortable' | 'compact';

const ROUTES: ReadonlyArray<{ id: string; title: string; keywords: string[] }> = [
  { id: 'use-debounce', title: 'useDebounce', keywords: ['timing', 'delay', 'search'] },
  { id: 'use-keyboard-shortcut', title: 'useKeyboardShortcut', keywords: ['hotkey', 'keys'] },
  { id: 'use-dialog-state', title: 'useDialogState', keywords: ['modal', 'dialog'] },
  { id: 'use-focus-trap', title: 'useFocusTrap', keywords: ['focus', 'modal', 'tab'] },
  { id: 'use-roving-tab-index', title: 'useRovingTabIndex', keywords: ['arrow keys', 'toolbar'] },
  { id: 'use-local-storage', title: 'useLocalStorage', keywords: ['persist', 'storage'] },
  { id: 'modal-dialog', title: 'Modal dialog scenario', keywords: ['dialog', 'confirm'] },
  { id: 'autocomplete-combobox', title: 'Autocomplete scenario', keywords: ['combobox', 'search'] },
];

/**
 * A ⌘K / Ctrl+K command palette for the playground: navigation commands
 * change the hash route, local actions change demo settings below, and
 * recently used commands come first.
 */
export default function CommandPaletteScenario() {
  const [density, setDensity] = useState<Density>('comfortable');
  const [showHints, setShowHints] = useState(true);
  const [, , clearRecent] = useLocalStorage<string[]>(RECENT_KEY, [], { validate: isStringArray });
  const [lastRun, setLastRun] = useState<string | null>(null);

  const commands = useMemo<Command[]>(() => {
    const navigation: Command[] = ROUTES.map((route) => ({
      id: `go:${route.id}`,
      title: `Go to ${route.title}`,
      group: 'Navigation',
      keywords: route.keywords,
      hint: `#/entry/${route.id}`,
      run: () => {
        window.location.hash = `#/entry/${route.id}`;
      },
    }));
    return [
      {
        id: 'go:home',
        title: 'Go to the home page',
        group: 'Navigation',
        keywords: ['start', 'index'],
        hint: '#/',
        run: () => {
          window.location.hash = '#/';
        },
      },
      ...navigation,
      {
        id: 'toggle-density',
        title: 'Toggle compact density',
        group: 'Actions',
        keywords: ['spacing', 'layout'],
        run: () => {
          setDensity((value) => (value === 'compact' ? 'comfortable' : 'compact'));
          setLastRun('Toggle compact density');
        },
      },
      {
        id: 'toggle-hints',
        title: 'Toggle keyboard hints',
        group: 'Actions',
        keywords: ['shortcuts', 'help'],
        run: () => {
          setShowHints((value) => !value);
          setLastRun('Toggle keyboard hints');
        },
      },
      {
        id: 'clear-recent',
        title: 'Clear recent commands',
        group: 'Actions',
        keywords: ['history', 'reset'],
        run: () => {
          // Storage writes are synchronous: this runs after the palette has
          // recorded the command itself, so the list really ends up empty.
          clearRecent();
          setLastRun('Clear recent commands');
        },
      },
    ];
  }, [clearRecent]);

  return (
    <div className="stack">
      <Panel
        title="Command palette"
        description="Press ⌘K on macOS or Ctrl+K elsewhere — from anywhere on the page, even inside a text field — or use the button. Navigation commands leave this page."
      >
        <div className="row">
          <CommandPalette commands={commands} />
        </div>
        <div className="command-palette-demo" data-density={density}>
          <ValueTable
            label="Demo settings"
            rows={{
              Density: density,
              'Keyboard hints': showHints ? 'shown' : 'hidden',
              'Last action': lastRun ?? '—',
            }}
          />
          {showHints ? (
            <p className="small muted">
              Tip: the palette remembers the last five commands you ran (in localStorage — ids only,
              nothing sensitive).
            </p>
          ) : null}
        </div>
      </Panel>
      <Callout title="Built from library hooks">
        <code>useKeyboardShortcut('mod+k')</code> maps to ⌘ on Apple platforms and Ctrl elsewhere,
        and is allowed inside inputs. <code>useDialogState</code> opens a native modal{' '}
        <code>&lt;dialog&gt;</code> — Escape closes it and focus returns to wherever it was. Inside,
        the input is an APG combobox with a grouped listbox.
      </Callout>
    </div>
  );
}
