import { useId } from 'react';
import type { CatalogEntry } from '../../catalog';
import { CodeBlock } from './CodeBlock';

type DiagramData = NonNullable<CatalogEntry['diagram']>;

/**
 * Shows a catalog diagram. The Mermaid source is rendered as an image on
 * GitHub in the generated docs; here we show the description (the accessible
 * text alternative) and the source.
 */
export function Diagram({ diagram }: { diagram: DiagramData }) {
  const descriptionId = useId();
  return (
    <figure className="diagram" aria-describedby={descriptionId}>
      <figcaption>
        <strong>{diagram.title}</strong>
      </figcaption>
      <p id={descriptionId} className="muted">
        {diagram.description}
      </p>
      <details>
        <summary>Mermaid source</summary>
        <CodeBlock code={diagram.mermaid} label="mermaid" lineNumbers={false} />
      </details>
    </figure>
  );
}
