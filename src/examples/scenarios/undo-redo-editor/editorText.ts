/**
 * Pure text helpers for the undo/redo editor: a tiny Markdown-ish parser for
 * the preview and the toolbar commands. Kept free of React and the DOM so they
 * can be unit-tested and reused.
 */

export interface Span {
  text: string;
  bold: boolean;
}

export type Block =
  | { kind: 'heading'; spans: Span[] }
  | { kind: 'list'; items: Span[][] }
  | { kind: 'paragraph'; spans: Span[] };

/** Splits `**bold**` runs. An unmatched `**` is kept as literal text. */
export function parseInline(line: string): Span[] {
  const spans: Span[] = [];
  let rest = line;
  while (rest.length > 0) {
    const open = rest.indexOf('**');
    const close = open === -1 ? -1 : rest.indexOf('**', open + 2);
    if (open === -1 || close === -1) {
      spans.push({ text: rest, bold: false });
      break;
    }
    if (open > 0) spans.push({ text: rest.slice(0, open), bold: false });
    const inner = rest.slice(open + 2, close);
    if (inner) spans.push({ text: inner, bold: true });
    rest = rest.slice(close + 2);
  }
  return spans;
}

/**
 * Parses `# heading`, `- bullet` and paragraphs (consecutive lines). The
 * result is plain data rendered as React elements — never as HTML, so user
 * input cannot inject markup.
 */
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length)
      blocks.push({ kind: 'paragraph', spans: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) {
      flushParagraph();
      blocks.push({ kind: 'heading', spans: parseInline(line.slice(2)) });
    } else if (line.startsWith('- ')) {
      flushParagraph();
      const last = blocks.at(-1);
      const item = parseInline(line.slice(2));
      if (last?.kind === 'list') last.items.push(item);
      else blocks.push({ kind: 'list', items: [item] });
    } else if (line.trim() === '') {
      flushParagraph();
    } else {
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  return blocks;
}

export interface TextEdit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Wraps the selection in `marker` (e.g. `**`), or inserts an empty pair at the caret. */
export function wrapSelection(text: string, start: number, end: number, marker: string): TextEdit {
  const from = Math.max(0, Math.min(start, end));
  const to = Math.min(text.length, Math.max(start, end));
  const selected = text.slice(from, to);
  return {
    text: text.slice(0, from) + marker + selected + marker + text.slice(to),
    selectionStart: from + marker.length,
    selectionEnd: to + marker.length,
  };
}

/** Adds `prefix` to the line containing `caret`, or removes it if present. */
export function toggleLinePrefix(text: string, caret: number, prefix: string): TextEdit {
  const position = Math.max(0, Math.min(caret, text.length));
  const lineStart = text.lastIndexOf('\n', position - 1) + 1;
  const hasPrefix = text.startsWith(prefix, lineStart);
  const next = hasPrefix
    ? text.slice(0, lineStart) + text.slice(lineStart + prefix.length)
    : text.slice(0, lineStart) + prefix + text.slice(lineStart);
  const shift = hasPrefix ? -prefix.length : prefix.length;
  const caretAfter = Math.max(lineStart, position + shift);
  return { text: next, selectionStart: caretAfter, selectionEnd: caretAfter };
}
