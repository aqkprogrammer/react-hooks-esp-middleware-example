import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Callout, Panel } from '../../../components/ui';
import './UseLayoutEffectDemo.css';

type Timing = 'effect' | 'layout';

interface Anchor {
  id: string;
  label: string;
  /** Position of the trigger relative to the stage, in px. */
  top: number;
  bottom: number;
  left: number;
}

const GAP = 8;

/** Blocks the main thread — only used to make the in-between frame visible. */
function blockFor(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // busy wait
  }
}

/**
 * Measure-then-position: the tooltip must know its own height before it can
 * be placed above its trigger. useLayoutEffect measures and re-renders before
 * the browser paints; useEffect lets the browser paint the wrong position
 * first.
 */
export default function UseLayoutEffectDemo() {
  const [exaggerate, setExaggerate] = useState(false);
  return (
    <div className="stack">
      <label className="row">
        <input
          type="checkbox"
          checked={exaggerate}
          onChange={(event) => setExaggerate(event.target.checked)}
        />
        Exaggerate: block for 300 ms inside each effect so the in-between frame stays on screen
      </label>
      <div className="grid">
        <Panel title="useEffect (may flicker)" description="Runs after the browser paints.">
          <TooltipStage timing="effect" blockMs={exaggerate ? 300 : 0} />
        </Panel>
        <Panel title="useLayoutEffect (no flicker)" description="Runs before the browser paints.">
          <TooltipStage timing="layout" blockMs={exaggerate ? 300 : 0} />
        </Panel>
      </div>
      <Callout title="Passive vs layout timing">
        Render → React commits DOM changes → <strong>layout effects</strong> run synchronously
        (state updates here re-render before paint) → the browser paints →{' '}
        <strong>passive effects</strong> (<code>useEffect</code>) run. Prefer <code>useEffect</code>
        ; use <code>useLayoutEffect</code> only to measure layout and fix it up before the user sees
        it, because it blocks painting. It does nothing on the server.
      </Callout>
    </div>
  );
}

function TooltipStage({ timing, blockMs }: { timing: Timing; blockMs: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const tooltipId = useId();

  const show = (id: string, label: string, element: HTMLElement) => {
    const stage = stageRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    setAnchor({
      id,
      label,
      top: rect.top - stageRect.top,
      bottom: rect.bottom - stageRect.top,
      left: rect.left - stageRect.left,
    });
  };
  const hide = () => setAnchor(null);

  const triggers = [
    { id: 'top', label: 'Near the top: no room above, flips below' },
    { id: 'bottom', label: 'Near the bottom: room above' },
  ];

  return (
    <div ref={stageRef} className="use-layout-effect-demo-stage">
      {triggers.map((trigger) => (
        <button
          key={trigger.id}
          type="button"
          className="btn"
          aria-describedby={anchor?.id === trigger.id ? tooltipId : undefined}
          onPointerEnter={(event) => show(trigger.id, trigger.label, event.currentTarget)}
          onPointerLeave={hide}
          onFocus={(event) => show(trigger.id, trigger.label, event.currentTarget)}
          onBlur={hide}
        >
          {trigger.id === 'top' ? 'Hover or focus me (top)' : 'Hover or focus me (bottom)'}
        </button>
      ))}
      {anchor ? (
        // key: a new trigger means a new tooltip that must be measured again.
        <Tooltip key={anchor.id} id={tooltipId} anchor={anchor} timing={timing} blockMs={blockMs}>
          {anchor.label}
        </Tooltip>
      ) : null}
    </div>
  );
}

interface TooltipProps {
  id: string;
  anchor: Anchor;
  timing: Timing;
  blockMs: number;
  children: string;
}

function Tooltip({ id, anchor, timing, blockMs, children }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  // Exactly one of these runs, depending on `timing`.
  useLayoutEffect(() => {
    if (timing !== 'layout' || !ref.current) return;
    if (blockMs) blockFor(blockMs);
    setHeight(ref.current.getBoundingClientRect().height);
  }, [timing, blockMs]);
  useEffect(() => {
    if (timing !== 'effect' || !ref.current) return;
    if (blockMs) blockFor(blockMs);
    setHeight(ref.current.getBoundingClientRect().height);
  }, [timing, blockMs]);

  // Before measuring, the best guess overlaps the trigger — that is the
  // frame useEffect lets the browser paint.
  const measured = height ?? 0;
  const fitsAbove = anchor.top - measured - GAP >= 0;
  const placement = height === null ? 'unmeasured' : fitsAbove ? 'above' : 'below';
  const top = placement === 'below' ? anchor.bottom + GAP : anchor.top - measured - GAP;

  return (
    <div
      ref={ref}
      id={id}
      role="tooltip"
      data-placement={placement}
      className="use-layout-effect-demo-tooltip"
      style={{ top, left: anchor.left }}
    >
      {children}
    </div>
  );
}
