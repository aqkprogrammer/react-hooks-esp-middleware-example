import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Button } from '../../../components/ui';
import { HttpError, useAnnouncer, useAsync, useDebounce } from '../../../hooks';
import { describeResults, fetchSuggestions, splitMatch } from './suggestions';

export interface LanguageComboboxProps {
  label: string;
  /** Called when the user picks a suggestion (Enter or click). */
  onSelect: (language: string) => void;
  /** Wait this long after the last keystroke before requesting suggestions. */
  debounceMs?: number;
}

interface ActiveOption {
  /** The response (`SuggestionResponse.query`) this index belongs to. */
  query: string;
  index: number;
}

/**
 * WAI-ARIA APG "editable combobox with list autocomplete": DOM focus stays
 * on the `<input role="combobox">`; the highlighted option is conveyed with
 * `aria-activedescendant`, so screen readers announce it while the user
 * keeps typing.
 */
export function LanguageCombobox({ label, onSelect, debounceMs = 250 }: LanguageComboboxProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;
  const hintId = `${id}-hint`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const [value, setValue] = useState('');
  // What the user typed (or picked) — the text suggestions are fetched for.
  const [searchTerm, setSearchTerm] = useState('');
  const [wantOpen, setWantOpen] = useState(false);
  const [active, setActive] = useState<ActiveOption>({ query: '', index: -1 });
  const { announce } = useAnnouncer();

  const debouncedTerm = useDebounce(searchTerm.trim(), debounceMs);
  // useAsync aborts the previous request whenever the term changes and never
  // lets an aborted (stale) response update state: the last term always wins.
  const search = useAsync((signal) => fetchSuggestions(debouncedTerm, signal), [debouncedTerm], {
    enabled: debouncedTerm.length > 0,
    keepPreviousData: true,
  });

  const response = search.status === 'error' ? undefined : search.data;
  const results = response?.results ?? [];
  const isOpen = wantOpen && value.trim().length > 0 && results.length > 0;
  // Derived: an index chosen for an older response is meaningless for this one.
  const activeIndex =
    isOpen && response && active.query === response.query && active.index < results.length
      ? active.index
      : -1;
  const isSearching = search.status === 'pending' && debouncedTerm.length > 0;
  const isTyping = searchTerm.trim() !== debouncedTerm;

  // Announce settled results (not every keystroke) while the user is searching.
  const settledQuery = search.status === 'success' ? search.data.query : null;
  const settledCount = search.status === 'success' ? search.data.results.length : 0;
  const failed = search.status === 'error';
  useEffect(() => {
    if (!wantOpen) return;
    if (failed) announce('Suggestions are unavailable.');
    else if (settledQuery) announce(describeResults(settledCount, settledQuery));
  }, [wantOpen, failed, settledQuery, settledCount, announce]);

  // Keep the highlighted option visible in a scrolling list.
  const activeOptionId = activeIndex === -1 ? undefined : optionId(activeIndex);
  useEffect(() => {
    if (!activeOptionId) return;
    const option = document.getElementById(activeOptionId);
    // jsdom and very old browsers lack scrollIntoView.
    if (option && typeof option.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
  }, [activeOptionId]);

  const highlight = (index: number) => {
    if (response) setActive({ query: response.query, index });
  };

  const select = (language: string) => {
    setValue(language);
    setSearchTerm(language);
    setWantOpen(false);
    onSelect(language);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = results.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (event.altKey) setWantOpen(true);
        else if (!isOpen) {
          setWantOpen(true);
          highlight(0);
        } else highlight(activeIndex >= last ? 0 : activeIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setWantOpen(true);
          highlight(last);
        } else highlight(activeIndex <= 0 ? last : activeIndex - 1);
        break;
      case 'Home':
      case 'End':
        // Only while an option is highlighted; otherwise keep text editing.
        if (activeIndex === -1) break;
        event.preventDefault();
        highlight(event.key === 'Home' ? 0 : last);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        // Visual focus returns to the text box; the caret moves as usual.
        if (activeIndex !== -1) highlight(-1);
        break;
      case 'Enter': {
        const option = activeIndex === -1 ? undefined : results[activeIndex];
        if (option === undefined) break;
        event.preventDefault();
        select(option);
        break;
      }
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          setWantOpen(false);
        } else if (value) {
          event.preventDefault();
          setValue('');
          setSearchTerm('');
        }
        break;
      default:
        break;
    }
  };

  let message: string | null = null;
  if (value.trim() && search.status === 'success' && results.length === 0 && !isTyping) {
    message = `No languages match “${value.trim()}”.`;
  }

  return (
    <div className="autocomplete-field">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <div className="autocomplete-control">
        <input
          id={inputId}
          className="input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-describedby={hintId}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSearchTerm(event.target.value);
            setWantOpen(true);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setWantOpen(false)}
        />
        {/* Clicking an option must not blur the input (mousedown default prevented). */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- options are reached via aria-activedescendant; the input handles every key */}
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="autocomplete-listbox"
          hidden={!isOpen}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            const target = event.target instanceof Element ? event.target : null;
            const option = target?.closest<HTMLElement>('[role="option"]');
            const index = Number(option?.dataset.index);
            const language = Number.isInteger(index) ? results[index] : undefined;
            if (language !== undefined) select(language);
          }}
        >
          {isOpen
            ? results.map((language, index) => {
                const parts = splitMatch(language, response?.query ?? '');
                return (
                  <li
                    key={language}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === activeIndex}
                    data-index={index}
                    className="autocomplete-option"
                    onMouseMove={() => {
                      if (index !== activeIndex) highlight(index);
                    }}
                  >
                    {parts.before}
                    {parts.match ? <mark className="autocomplete-mark">{parts.match}</mark> : null}
                    {parts.after}
                  </li>
                );
              })
            : null}
        </ul>
      </div>
      <p id={hintId} className="field-hint">
        Type to search, then use <kbd className="kbd">↓</kbd>/<kbd className="kbd">↑</kbd> and{' '}
        <kbd className="kbd">Enter</kbd>. <kbd className="kbd">Esc</kbd> closes the list, a second{' '}
        <kbd className="kbd">Esc</kbd> clears the field.
      </p>
      <p className="autocomplete-status small muted" aria-hidden="true">
        {isTyping || isSearching ? 'Searching…' : (message ?? ' ')}
      </p>
      {search.status === 'error' && searchTerm.trim() ? (
        <div className="callout callout-danger autocomplete-error">
          <span>
            Suggestions are unavailable
            {search.error instanceof HttpError ? ` (HTTP ${search.error.status})` : ''}.
          </span>{' '}
          <Button size="sm" onClick={search.reload}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
