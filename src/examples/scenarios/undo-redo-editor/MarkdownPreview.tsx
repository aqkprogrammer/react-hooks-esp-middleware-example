import { useMemo } from 'react';
import { parseBlocks, type Span } from './editorText';

function Spans({ spans }: { spans: Span[] }) {
  return spans.map((span, index) =>
    span.bold ? <strong key={index}>{span.text}</strong> : <span key={index}>{span.text}</span>,
  );
}

/** Renders the parsed blocks as React elements (no `dangerouslySetInnerHTML`). */
export function MarkdownPreview({ title, body }: { title: string; body: string }) {
  const blocks = useMemo(() => parseBlocks(body), [body]);
  return (
    <article className="undo-editor-preview" aria-label="Preview">
      <h4 className="undo-editor-preview-title">{title.trim() || 'Untitled note'}</h4>
      {blocks.length === 0 ? <p className="muted">Nothing to preview yet.</p> : null}
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <h5 key={index}>
              <Spans spans={block.spans} />
            </h5>
          );
        }
        if (block.kind === 'list') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Spans spans={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index}>
            <Spans spans={block.spans} />
          </p>
        );
      })}
    </article>
  );
}
