import { useEffect, useId, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import {
  formatShortcut,
  isApplePlatform,
  useAnnouncer,
  useDialogState,
  useKeyboardShortcut,
  useLocalStorage,
} from '../../../hooks';
import { buildSections, isStringArray, pushRecent, RECENT_KEY, type Command } from './commands';

export const PALETTE_SHORTCUT = 'mod+k';

const noopSubscribe = () => () => {};
const serverIsApple = () => false;

interface ActiveOption {
  query: string;
  index: number;
}

export interface CommandPaletteProps {
  commands: readonly Command[];
}

/**
 * ⌘K / Ctrl+K command palette: a native modal `<dialog>` (`useDialogState`)
 * containing an APG combobox whose listbox groups commands. Recently run
 * commands are remembered in localStorage (ids only).
 */
export function CommandPalette({ commands }: CommandPaletteProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const groupId = (group: string) => `${id}-group-${group}`;

  const [query, setQuery] = useState('');
  const [active, setActive] = useState<ActiveOption>({ query: '', index: 0 });
  const [recent, setRecent] = useLocalStorage<string[]>(RECENT_KEY, [], {
    validate: isStringArray,
  });
  const { announce } = useAnnouncer();
  const apple = useSyncExternalStore(noopSubscribe, isApplePlatform, serverIsApple);
  const shortcutLabel = formatShortcut(PALETTE_SHORTCUT, { apple });

  const { dialogProps, titleId, open, close, isOpen } = useDialogState({
    closeOnBackdropClick: true,
  });

  const sections = buildSections(commands, query, recent);
  const flat = sections.flatMap((section) => section.commands);
  // Index of each section's first command in `flat` (options are numbered globally).
  const offsets = sections.map((_section, index) =>
    sections.slice(0, index).reduce((total, previous) => total + previous.commands.length, 0),
  );
  // Derived: typing resets the highlight to the best match.
  const activeIndex =
    flat.length === 0 ? -1 : active.query === query ? Math.min(active.index, flat.length - 1) : 0;
  const activeCommand = activeIndex === -1 ? undefined : flat[activeIndex];
  const activeOptionId = activeIndex === -1 ? undefined : optionId(activeIndex);

  const openPalette = () => {
    setQuery('');
    setActive({ query: '', index: 0 });
    open();
    document.getElementById(inputId)?.focus();
  };

  useKeyboardShortcut(
    PALETTE_SHORTCUT,
    () => {
      if (isOpen) close('toggle');
      else openPalette();
    },
    // Must also work while typing — including in the palette's own input.
    { allowInInputs: true },
  );

  // Tell screen reader users how many commands match (debounced by the announcer).
  const count = flat.length;
  useEffect(() => {
    if (!isOpen) return;
    announce(
      count === 0
        ? 'No matching commands.'
        : `${count} ${count === 1 ? 'command' : 'commands'} available.`,
    );
  }, [isOpen, query, count, announce]);

  useEffect(() => {
    if (!activeOptionId) return;
    const option = document.getElementById(activeOptionId);
    if (option && typeof option.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
  }, [activeOptionId]);

  const runCommand = (command: Command) => {
    setRecent((previous) => pushRecent(previous, command.id));
    // Close first so focus is restored before the command (e.g. a route
    // change) moves it somewhere else.
    close('run');
    command.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (flat.length === 0) return;
    const last = flat.length - 1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next =
        event.key === 'ArrowDown'
          ? activeIndex >= last
            ? 0
            : activeIndex + 1
          : activeIndex <= 0
            ? last
            : activeIndex - 1;
      setActive({ query, index: next });
    } else if (event.key === 'Enter' && activeCommand) {
      event.preventDefault();
      runCommand(activeCommand);
    }
  };

  return (
    <>
      <button type="button" className="btn command-palette-trigger" onClick={openPalette}>
        <span>Search commands…</span>
        <kbd className="kbd" aria-hidden="true">
          {shortcutLabel}
        </kbd>
        <span className="visually-hidden">({shortcutLabel})</span>
      </button>

      <dialog {...dialogProps} className="command-palette">
        <h3 id={titleId} className="visually-hidden">
          Command palette
        </h3>
        <label htmlFor={inputId} className="visually-hidden">
          Search commands
        </label>
        <input
          id={inputId}
          className="input command-palette-input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={flat.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          placeholder="Type a command or search…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {flat.length > 0 ? (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus -- options are reached via aria-activedescendant; the input keeps DOM focus and handles every key
          <div
            id={listboxId}
            role="listbox"
            aria-label="Commands"
            className="command-palette-list"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              const target = event.target instanceof Element ? event.target : null;
              const index = Number(target?.closest<HTMLElement>('[role="option"]')?.dataset.index);
              const command = Number.isInteger(index) ? flat[index] : undefined;
              if (command) runCommand(command);
            }}
          >
            {sections.map((section, sectionIndex) => (
              <ul
                key={section.group}
                role="group"
                aria-labelledby={groupId(section.group)}
                className="command-palette-section"
              >
                <li
                  role="presentation"
                  id={groupId(section.group)}
                  className="command-palette-group"
                >
                  {section.group}
                </li>
                {section.commands.map((command, commandIndex) => {
                  const index = (offsets[sectionIndex] ?? 0) + commandIndex;
                  return (
                    <li
                      key={command.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === activeIndex}
                      data-index={index}
                      className="command-palette-option"
                      onMouseMove={() => {
                        if (index !== activeIndex) setActive({ query, index });
                      }}
                    >
                      <span>{command.title}</span>
                      {command.hint ? (
                        <span className="command-palette-hint mono small">{command.hint}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        ) : (
          <p className="muted command-palette-empty">No commands match “{query.trim()}”.</p>
        )}
        <p className="command-palette-footer small muted">
          <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> to move,{' '}
          <kbd className="kbd">Enter</kbd> to run, <kbd className="kbd">Esc</kbd> to close
        </p>
      </dialog>
    </>
  );
}
