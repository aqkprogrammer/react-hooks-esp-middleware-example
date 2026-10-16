import { useMemo } from 'react';
import { useEventListener, type EventTargetLike } from '../browser/useEventListener';
import { isBrowser } from '../internal/env';
import { useLatest } from '../state/useLatest';

/** A parsed shortcut such as `mod+shift+k`. */
export interface ParsedShortcut {
  /** Original text, e.g. `"mod+k"`. */
  source: string;
  /** Lower-case `KeyboardEvent.key` value, e.g. `"k"`, `"escape"`, `"?"`, `" "`. */
  key: string;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  /** `⌘` on Apple platforms, `Ctrl` elsewhere. */
  mod: boolean;
  /**
   * `'any'` for symbols written without `shift` (e.g. `?`), because whether
   * Shift is needed to type them depends on the keyboard layout.
   */
  shift: boolean | 'any';
}

const MODIFIERS: Record<string, 'ctrl' | 'alt' | 'meta' | 'mod' | 'shift'> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  super: 'meta',
  win: 'meta',
  mod: 'mod',
  shift: 'shift',
};

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  space: ' ',
  spacebar: ' ',
  plus: '+',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
  return: 'enter',
};

/**
 * Parses `"mod+k"`, `"shift+?"`, `"ctrl+alt+delete"`, `"escape"`, `"ctrl++"`
 * (or `"ctrl+plus"`). Case-insensitive. Throws on unknown modifiers or a
 * missing key, so typos fail loudly in development.
 */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const source = shortcut.trim();
  const lower = source.toLowerCase();
  let parts: string[];
  if (lower === '+') parts = ['+'];
  else if (lower.endsWith('++')) parts = [...lower.slice(0, -2).split('+'), '+'];
  else parts = lower.split('+');
  const rawKey = parts.pop()?.trim() ?? '';
  if (!rawKey) throw new Error(`Invalid shortcut "${shortcut}": missing key`);

  const parsed: ParsedShortcut = {
    source,
    key: KEY_ALIASES[rawKey] ?? rawKey,
    ctrl: false,
    alt: false,
    meta: false,
    mod: false,
    shift: false,
  };
  for (const part of parts) {
    const modifier = MODIFIERS[part.trim()];
    if (!modifier) throw new Error(`Invalid shortcut "${shortcut}": unknown modifier "${part}"`);
    parsed[modifier] = true;
  }
  const isSymbol = parsed.key.length === 1 && !/[a-z0-9 ]/.test(parsed.key);
  if (isSymbol && !parts.some((part) => part.trim() === 'shift')) parsed.shift = 'any';
  return parsed;
}

/** True on macOS/iOS/iPadOS, where `mod` means ⌘. Always `false` on the server. */
export function isApplePlatform(): boolean {
  if (!isBrowser || typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || navigator.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** Does `event` match `shortcut`? Modifiers must match exactly (`k` does not fire on Ctrl+K). */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ParsedShortcut | string,
  apple: boolean = isApplePlatform(),
): boolean {
  const parsed = typeof shortcut === 'string' ? parseShortcut(shortcut) : shortcut;
  if (typeof event.key !== 'string') return false;
  const wantCtrl = parsed.ctrl || (parsed.mod && !apple);
  const wantMeta = parsed.meta || (parsed.mod && apple);
  if (event.ctrlKey !== wantCtrl || event.metaKey !== wantMeta || event.altKey !== parsed.alt) {
    return false;
  }
  if (parsed.shift !== 'any' && event.shiftKey !== parsed.shift) return false;
  if (event.key.toLowerCase() === parsed.key) return true;
  // Option/Alt on macOS and non-Latin layouts change `key` (Alt+K → "˚");
  // fall back to the physical key for letters and digits.
  if (/^[a-z]$/.test(parsed.key)) return event.code === `Key${parsed.key.toUpperCase()}`;
  if (/^[0-9]$/.test(parsed.key)) return event.code === `Digit${parsed.key}`;
  return false;
}

const SYMBOLS: Record<string, [apple: string, other: string]> = {
  meta: ['⌘', 'Win'],
  ctrl: ['⌃', 'Ctrl'],
  alt: ['⌥', 'Alt'],
  shift: ['⇧', 'Shift'],
};

/**
 * Human-readable label: `formatShortcut('mod+shift+k', { apple: true })` →
 * `"⇧⌘K"`, and `"Ctrl+Shift+K"` otherwise. Pure, so it is safe during render
 * — decide `apple` in a way that does not cause a hydration mismatch.
 */
export function formatShortcut(shortcut: string, { apple }: { apple: boolean }): string {
  const parsed = parseShortcut(shortcut);
  const labels: string[] = [];
  const add = (name: keyof typeof SYMBOLS) => {
    const symbol = SYMBOLS[name];
    if (symbol) labels.push(apple ? symbol[0] : symbol[1]);
  };
  // Platform conventions: macOS orders ⌃⌥⇧⌘; Windows/Linux order Ctrl+Alt+Shift+Win.
  if (apple) {
    if (parsed.ctrl) add('ctrl');
    if (parsed.alt) add('alt');
    if (parsed.shift === true) add('shift');
    if (parsed.meta || parsed.mod) add('meta');
  } else {
    if (parsed.ctrl || parsed.mod) add('ctrl');
    if (parsed.alt) add('alt');
    if (parsed.shift === true) add('shift');
    if (parsed.meta) add('meta');
  }
  const named: Record<string, string> = {
    ' ': 'Space',
    escape: 'Esc',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    enter: apple ? '↩' : 'Enter',
  };
  const key =
    named[parsed.key] ?? (parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.key);
  const keyLabel = key.charAt(0).toUpperCase() + key.slice(1);
  return apple ? [...labels, keyLabel].join('') : [...labels, keyLabel].join('+');
}

const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/** True when the event target is a text field, select or contenteditable region. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return (
    target.isContentEditable ||
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
}

export interface UseKeyboardShortcutOptions {
  /** Default `true`. */
  enabled?: boolean;
  /** Where to listen. Default `window`; pass a ref to scope the shortcut to a region. */
  target?: EventTargetLike;
  /** Default `'keydown'`. */
  eventType?: 'keydown' | 'keyup';
  /** Call `event.preventDefault()` on a match (e.g. to stop the browser's own Ctrl+K). Default `true`. */
  preventDefault?: boolean;
  /** Also fire while the user types in an input, textarea, select or contenteditable. Default `false`. */
  allowInInputs?: boolean;
  /** Fire for auto-repeated key presses (key held down). Default `false`. */
  allowRepeat?: boolean;
}

/**
 * Runs `handler` when a keyboard shortcut is pressed.
 *
 * - Combos like `"mod+k"` (⌘K on Apple platforms, Ctrl+K elsewhere),
 *   `"shift+?"`, `"alt+arrowup"`, or a list of alternatives.
 * - Exact modifier matching; IME composition is ignored.
 * - Ignored while typing in form fields unless `allowInInputs` is set.
 * - The latest `handler` is always called; the listener is removed on unmount.
 *
 * Single-key shortcuts must be remappable or disableable to meet WCAG 2.1.4
 * (Character Key Shortcuts) — expose an `enabled` toggle in your settings.
 */
export function useKeyboardShortcut(
  shortcut: string | readonly string[],
  handler: (event: KeyboardEvent, shortcut: string) => void,
  options: UseKeyboardShortcutOptions = {},
): void {
  const {
    enabled = true,
    target,
    eventType = 'keydown',
    preventDefault = true,
    allowInInputs = false,
    allowRepeat = false,
  } = options;
  const signature = typeof shortcut === 'string' ? shortcut : shortcut.join('\n');
  const parsed = useMemo(() => signature.split('\n').map(parseShortcut), [signature]);
  const handlerRef = useLatest(handler);

  useEventListener<KeyboardEvent>(
    eventType,
    (event) => {
      if (event.isComposing || (event.repeat && !allowRepeat)) return;
      if (!allowInInputs && isTypingTarget(event.target)) return;
      const apple = isApplePlatform();
      const match = parsed.find((candidate) => matchesShortcut(event, candidate, apple));
      if (!match) return;
      if (preventDefault) event.preventDefault();
      handlerRef.current(event, match.source);
    },
    enabled ? target : null,
  );
}
