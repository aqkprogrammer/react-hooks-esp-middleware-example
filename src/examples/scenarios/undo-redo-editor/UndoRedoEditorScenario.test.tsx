import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseBlocks, parseInline, toggleLinePrefix, wrapSelection } from './editorText';
import UndoRedoEditorScenario from './UndoRedoEditorScenario';

afterEach(() => {
  vi.useRealTimers();
});

const body = () => screen.getByLabelText('Body') as HTMLTextAreaElement;
const historyItems = () =>
  within(screen.getByRole('list', { name: 'History' })).getAllByRole('button');

describe('editorText helpers', () => {
  it('parses headings, bullets, paragraphs and bold runs', () => {
    expect(parseInline('a **b** c **open')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c **open', bold: false },
    ]);
    expect(parseBlocks('# Title\n- one\n- two\n\nline a\nline b').map((b) => b.kind)).toEqual([
      'heading',
      'list',
      'paragraph',
    ]);
  });

  it('wraps selections and toggles line prefixes', () => {
    expect(wrapSelection('hello world', 6, 11, '**').text).toBe('hello **world**');
    const added = toggleLinePrefix('one\ntwo', 5, '- ');
    expect(added.text).toBe('one\n- two');
    expect(toggleLinePrefix(added.text, 7, '- ').text).toBe('one\ntwo');
  });
});

describe('UndoRedoEditorScenario', () => {
  it('coalesces a burst of typing into one undo step', async () => {
    const user = userEvent.setup();
    render(<UndoRedoEditorScenario />);
    const original = body().value;
    await user.type(body(), ' Hello');
    // The initial snapshot + one coalesced step for six keystrokes.
    expect(historyItems()).toHaveLength(2);
    await user.keyboard('{Control>}z{/Control}');
    expect(body()).toHaveValue(original);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('starts a new step after a pause longer than the coalescing window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const user = userEvent.setup();
    render(<UndoRedoEditorScenario />);
    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Draft');
    vi.setSystemTime(Date.now() + 2000);
    await user.type(title, ' two');
    expect(title).toHaveValue('Draft two');
    fireEvent.keyDown(title, { key: 'z', ctrlKey: true });
    expect(title).toHaveValue('Draft');
  });

  it('redoes with Ctrl+Shift+Z and Ctrl+Y, and a new edit clears the redo stack', async () => {
    const user = userEvent.setup();
    render(<UndoRedoEditorScenario />);
    await user.type(body(), '!');
    const edited = body().value;
    await user.keyboard('{Control>}z{/Control}');
    expect(body().value).not.toBe(edited);
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(body()).toHaveValue(edited);
    await user.keyboard('{Control>}z{/Control}');
    await user.keyboard('{Control>}y{/Control}');
    expect(body()).toHaveValue(edited);

    await user.keyboard('{Control>}z{/Control}');
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
    await user.type(body(), '?');
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('does not hijack Ctrl+Z in inputs outside the editor', async () => {
    const user = userEvent.setup();
    render(<UndoRedoEditorScenario />);
    await user.type(body(), ' more');
    const edited = body().value;
    const scratch = screen.getByLabelText('Scratch pad (not part of the note history)');
    await user.type(scratch, 'x');
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    scratch.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(body()).toHaveValue(edited);
  });

  it('applies toolbar commands as discrete steps and restores the selection', async () => {
    const user = userEvent.setup();
    render(<UndoRedoEditorScenario />);
    await user.clear(body());
    await user.type(body(), 'word');
    body().setSelectionRange(0, 4);
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(body()).toHaveValue('**word**');
    expect(body().selectionStart).toBe(2);
    expect(body().selectionEnd).toBe(6);
    await user.click(screen.getByRole('button', { name: 'Heading' }));
    expect(body()).toHaveValue('# **word**');
    expect(screen.getByRole('article', { name: 'Preview' })).toContainHTML('<strong>word</strong>');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(body()).toHaveValue('**word**');
  });

  it('jumps through history from the history panel and resets', async () => {
    const user = userEvent.setup();
    render(<UndoRedoEditorScenario />);
    const title = screen.getByLabelText('Title');
    await user.type(title, ' A');
    await user.type(body(), ' B');
    expect(historyItems()).toHaveLength(3);
    await user.click(historyItems()[0]!);
    expect(title).toHaveValue('Release notes');
    expect(historyItems()[0]).toHaveAttribute('aria-current', 'step');
    await user.click(historyItems()[2]!);
    expect(title).toHaveValue('Release notes A');
    expect(body().value.endsWith(' B')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Discard changes and history' }));
    expect(historyItems()).toHaveLength(1);
    expect(title).toHaveValue('Release notes');
  });
});
