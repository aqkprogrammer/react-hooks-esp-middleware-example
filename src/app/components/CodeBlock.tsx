import { useMemo } from 'react';
import { highlight } from '../highlight';
import { CopyButton } from './CopyButton';

export interface CodeBlockProps {
  code: string;
  label?: string;
  /** Show line numbers (default true for multi-line code). */
  lineNumbers?: boolean;
  copy?: boolean;
}

export function CodeBlock({ code, label, lineNumbers, copy = true }: CodeBlockProps) {
  const tokens = useMemo(() => highlight(code), [code]);
  const lines = code.split('\n').length;
  const showNumbers = lineNumbers ?? lines > 3;
  return (
    <div className="code-block">
      {label || copy ? (
        <div className="code-block-header">
          <span className="code-block-label">{label}</span>
          {copy ? <CopyButton text={code} /> : null}
        </div>
      ) : null}
      {/* A focusable, labelled region lets keyboard users scroll long code. */}
      <pre
        tabIndex={0}
        role="region"
        aria-label={label ? `Code: ${label}` : 'Code'}
        className={showNumbers ? 'with-lines' : undefined}
      >
        {showNumbers ? (
          <span className="line-numbers" aria-hidden="true">
            {Array.from({ length: lines }, (_, index) => `${index + 1}\n`).join('')}
          </span>
        ) : null}
        <code>
          {tokens.map((token, index) =>
            token.kind === 'plain' ? (
              token.text
            ) : (
              <span key={index} className={`tok-${token.kind}`}>
                {token.text}
              </span>
            ),
          )}
        </code>
      </pre>
    </div>
  );
}
