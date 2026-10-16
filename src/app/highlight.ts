/**
 * A deliberately small TypeScript/TSX highlighter: comments, strings,
 * keywords, numbers, JSX tags and type-ish identifiers. It tokenises with
 * one regex pass and returns spans; it is not a parser, and that's fine for
 * read-only snippets.
 */
export type TokenKind = 'comment' | 'string' | 'keyword' | 'number' | 'tag' | 'type' | 'plain';

export interface Token {
  kind: TokenKind;
  text: string;
}

const keywords = new Set(
  (
    'as async await break case catch class const continue default delete do else enum export extends ' +
    'false finally for from function if implements import in instanceof interface let new null of ' +
    'private protected public readonly return satisfies static super switch this throw true try type ' +
    'typeof undefined var void while yield keyof infer never unknown any'
  ).split(' '),
);

const tokenPattern =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(<\/?[A-Za-z][\w.]*)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

export function highlight(source: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of source.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ kind: 'plain', text: source.slice(lastIndex, index) });
    const [text] = match;
    let kind: TokenKind = 'plain';
    if (match[1]) kind = 'comment';
    else if (match[2]) kind = 'string';
    else if (match[3]) kind = 'tag';
    else if (match[4]) kind = 'number';
    else if (match[5]) {
      if (keywords.has(text)) kind = 'keyword';
      else if (/^[A-Z]/.test(text)) kind = 'type';
    }
    tokens.push({ kind, text });
    lastIndex = index + text.length;
  }
  if (lastIndex < source.length) tokens.push({ kind: 'plain', text: source.slice(lastIndex) });
  return tokens;
}
