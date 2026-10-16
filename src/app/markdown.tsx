import { Fragment, type ReactNode } from 'react';

/**
 * Renders the catalog's tiny Markdown subset: `code`, **bold**, *emphasis*
 * and [links](https://...). Text is never injected as HTML.
 */
const pattern =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+|#[^)\s]*)\))/g;

export function md(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    const [token] = match;
    if (match[1]) parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
    else if (match[2]) parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    else if (match[3]) parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    else if (match[4]) {
      const label = token.slice(1, token.indexOf(']'));
      const url = match[5] ?? '#';
      const external = url.startsWith('http');
      parts.push(
        <a key={key++} href={url} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
          {label}
        </a>,
      );
    }
    lastIndex = index + token.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <Fragment>{parts}</Fragment>;
}
