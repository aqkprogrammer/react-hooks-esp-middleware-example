import { useRef, useState } from 'react';
import { Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useReducedMotion, useScrollPosition } from '../../../hooks';
import './UseScrollPositionDemo.css';

const PARAGRAPHS = Array.from(
  { length: 14 },
  (_, index) =>
    `Section ${index + 1}. Scroll events can fire many times per frame; this hook reads the position at most once per animation frame and only re-renders when it changed.`,
);

export default function UseScrollPositionDemo() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const element = useScrollPosition(scrollerRef);
  const page = useScrollPosition();
  const reducedMotion = useReducedMotion();
  // Scrollable distance, measured in the scroll handler (event handlers may read the DOM).
  const [maxScroll, setMaxScroll] = useState(1);

  const scrollToTop = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    } else {
      scroller.scrollTop = 0;
    }
  };

  return (
    <div className="stack">
      <Panel title="Element scroll" description="Scroll inside the box.">
        <div
          ref={scrollerRef}
          className="use-scroll-position-demo-scroller"
          tabIndex={0}
          role="region"
          aria-label="Scrollable article"
          onScroll={(event) => {
            const target = event.currentTarget;
            // Same value → React bails out, so this does not re-render per event.
            setMaxScroll(Math.max(1, target.scrollHeight - target.clientHeight));
          }}
        >
          {PARAGRAPHS.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        <label className="field">
          <span className="field-label">
            Reading progress: {Math.round(Math.min(1, element.y / maxScroll) * 100)}%
          </span>
          <progress className="progress" max={maxScroll} value={Math.min(element.y, maxScroll)} />
        </label>
        <div className="row">
          <Button onClick={scrollToTop} disabled={element.y === 0}>
            Back to top{reducedMotion ? '' : ' (smooth)'}
          </Button>
        </div>
        <ValueTable rows={{ 'Element scrollTop': `${Math.round(element.y)}px` }} />
      </Panel>
      <Panel title="Window scroll">
        <ValueTable
          rows={{
            'window.scrollX': `${Math.round(page.x)}px`,
            'window.scrollY': `${Math.round(page.y)}px`,
          }}
        />
        <p className="small muted">Scroll the whole page to update these values.</p>
      </Panel>
      <Callout title="Scroll-linked visuals belong in CSS">
        Sticky headers, progress bars and parallax can use <code>position: sticky</code> or CSS
        scroll-driven animations without re-rendering React on scroll.
      </Callout>
    </div>
  );
}
