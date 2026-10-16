import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  formatShortcut,
  isApplePlatform,
  matchesShortcut,
  parseShortcut,
  useKeyboardShortcut,
  type UseKeyboardShortcutOptions,
} from './useKeyboardShortcut';

const keydown = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

function setPlatform(platform: string) {
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
}

describe('parseShortcut', () => {
  it('parses modifiers, aliases and the plus key', () => {
    expect(parseShortcut('Mod+Shift+K')).toMatchObject({ key: 'k', mod: true, shift: true });
    expect(parseShortcut('esc').key).toBe('escape');
    expect(parseShortcut('ctrl++')).toMatchObject({ key: '+', ctrl: true });
    expect(parseShortcut('ctrl+plus')).toMatchObject({ key: '+', ctrl: true });
    expect(parseShortcut('?').shift).toBe('any');
    expect(parseShortcut('shift+?').shift).toBe(true);
  });

  it('throws on typos', () => {
    expect(() => parseShortcut('ctlr+k')).toThrow(/unknown modifier/);
    expect(() => parseShortcut('ctrl+')).toThrow(/missing key/);
  });
});

describe('matchesShortcut', () => {
  it('maps mod to Ctrl on other platforms and ⌘ on Apple platforms', () => {
    expect(matchesShortcut(keydown({ key: 'k', ctrlKey: true }), 'mod+k', false)).toBe(true);
    expect(matchesShortcut(keydown({ key: 'k', metaKey: true }), 'mod+k', false)).toBe(false);
    expect(matchesShortcut(keydown({ key: 'k', metaKey: true }), 'mod+k', true)).toBe(true);
  });

  it('requires exact modifiers but lets layout-dependent symbols ignore Shift', () => {
    expect(matchesShortcut(keydown({ key: 'k', ctrlKey: true }), 'k', false)).toBe(false);
    expect(matchesShortcut(keydown({ key: 'K', shiftKey: true }), 'k', false)).toBe(false);
    expect(matchesShortcut(keydown({ key: '?', shiftKey: true }), '?', false)).toBe(true);
    expect(matchesShortcut(keydown({ key: '?', shiftKey: true }), 'shift+?', false)).toBe(true);
    expect(matchesShortcut(keydown({ key: '?' }), 'shift+?', false)).toBe(false);
  });

  it('falls back to the physical key when Alt changes the character', () => {
    const event = keydown({ key: '˚', code: 'KeyK', altKey: true });
    expect(matchesShortcut(event, 'alt+k', true)).toBe(true);
  });
});

describe('formatShortcut / isApplePlatform', () => {
  it('formats per platform', () => {
    expect(formatShortcut('mod+shift+k', { apple: true })).toBe('⇧⌘K');
    expect(formatShortcut('mod+shift+k', { apple: false })).toBe('Ctrl+Shift+K');
    expect(formatShortcut('escape', { apple: false })).toBe('Esc');
    expect(formatShortcut('?', { apple: false })).toBe('?');
    expect(formatShortcut('ctrl+alt+delete', { apple: false })).toBe('Ctrl+Alt+Delete');
  });

  it('detects Apple platforms from navigator.platform', () => {
    setPlatform('MacIntel');
    expect(isApplePlatform()).toBe(true);
    setPlatform('Win32');
    expect(isApplePlatform()).toBe(false);
  });
});

function Harness({
  shortcut,
  handler,
  options,
}: {
  shortcut: string | string[];
  handler: (event: KeyboardEvent, shortcut: string) => void;
  options?: UseKeyboardShortcutOptions;
}) {
  useKeyboardShortcut(shortcut, handler, options);
  return (
    <div>
      <label>
        Search <input />
      </label>
      <label>
        Notes <textarea />
      </label>
      <label>
        Agree <input type="checkbox" />
      </label>
      <div contentEditable suppressContentEditableWarning aria-label="Editor" role="textbox">
        text
      </div>
    </div>
  );
}

describe('useKeyboardShortcut', () => {
  it('fires on the combo, prevents the default and reports which shortcut matched', async () => {
    setPlatform('Win32');
    const user = userEvent.setup();
    const handler = vi.fn((event: KeyboardEvent) => event.defaultPrevented);
    render(<Harness shortcut={['mod+k', 'shift+?']} handler={handler} />);
    await user.keyboard('{Control>}k{/Control}');
    expect(handler).toHaveBeenLastCalledWith(expect.any(KeyboardEvent), 'mod+k');
    expect(handler.mock.results[0]?.value).toBe(true);
    await user.keyboard('{Shift>}?{/Shift}');
    expect(handler).toHaveBeenLastCalledWith(expect.any(KeyboardEvent), 'shift+?');
    await user.keyboard('k');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('ignores typing in text fields and contenteditable, but not in checkboxes', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Harness shortcut="/" handler={handler} />);
    await user.click(screen.getByLabelText('Search'));
    await user.keyboard('/');
    await user.click(screen.getByLabelText('Notes'));
    await user.keyboard('/');
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Editor' }), { key: '/' });
    expect(handler).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Search')).toHaveValue('/');

    await user.click(screen.getByLabelText('Agree'));
    await user.keyboard('/');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fires inside inputs when allowInInputs is set', async () => {
    setPlatform('Win32');
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Harness shortcut="mod+k" handler={handler} options={{ allowInInputs: true }} />);
    await user.click(screen.getByLabelText('Search'));
    await user.keyboard('{Control>}k{/Control}');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores auto-repeat and IME composition unless allowed', () => {
    const handler = vi.fn();
    const { rerender } = render(<Harness shortcut="j" handler={handler} />);
    fireEvent.keyDown(window, { key: 'j', repeat: true });
    fireEvent.keyDown(window, { key: 'j', isComposing: true });
    expect(handler).not.toHaveBeenCalled();
    rerender(<Harness shortcut="j" handler={handler} options={{ allowRepeat: true }} />);
    fireEvent.keyDown(window, { key: 'j', repeat: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('can be disabled, scoped to an element, and is removed on unmount', () => {
    const handler = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ enabled }) => useKeyboardShortcut('g', handler, { enabled }),
      { initialProps: { enabled: false } },
    );
    fireEvent.keyDown(window, { key: 'g' });
    expect(handler).not.toHaveBeenCalled();
    rerender({ enabled: true });
    fireEvent.keyDown(window, { key: 'g' });
    expect(handler).toHaveBeenCalledTimes(1);
    unmount();
    fireEvent.keyDown(window, { key: 'g' });
    expect(handler).toHaveBeenCalledTimes(1);

    const scoped = vi.fn();
    function Scoped() {
      const ref = useRef<HTMLDivElement>(null);
      useKeyboardShortcut('x', scoped, { target: ref });
      return (
        <div ref={ref}>
          <button type="button">Inside</button>
        </div>
      );
    }
    render(<Scoped />);
    fireEvent.keyDown(document.body, { key: 'x' });
    expect(scoped).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Inside' }), { key: 'x' });
    expect(scoped).toHaveBeenCalledTimes(1);
  });
});
