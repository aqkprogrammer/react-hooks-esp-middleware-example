import { useId, useRef, useState, type PointerEvent } from 'react';
import { Button, Callout, Panel } from '../../../components/ui';
import './UseRefCanvasDemo.css';

const WIDTH = 640;
const HEIGHT = 260;

interface Point {
  x: number;
  y: number;
}

/**
 * Canvas drawing: the <canvas> element and the in-progress stroke live in
 * refs; only what the UI shows (stroke count, brush size) lives in state.
 */
export default function UseRefCanvasDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointRef = useRef<Point | null>(null); // changes on every pointermove: no re-render
  const [brush, setBrush] = useState(4);
  const [strokes, setStrokes] = useState(0);
  const [unsupported, setUnsupported] = useState(false);
  const brushId = useId();

  const getContext = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d') ?? null;
    if (!canvas || !context) {
      setUnsupported(true);
      return null;
    }
    // Colours come from CSS variables: the canvas' `color` is var(--accent).
    context.strokeStyle = getComputedStyle(canvas).color || 'currentColor';
    context.lineWidth = brush;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    return context;
  };

  const toCanvasPoint = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = rect.width ? WIDTH / rect.width : 1;
    const scaleY = rect.height ? HEIGHT / rect.height : 1;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!getContext()) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    lastPointRef.current = toCanvasPoint(event);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const from = lastPointRef.current;
    if (!from) return;
    const context = getContext();
    if (!context) return;
    const to = toCanvasPoint(event);
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    lastPointRef.current = to;
  };
  const endStroke = () => {
    if (!lastPointRef.current) return;
    lastPointRef.current = null;
    setStrokes((count) => count + 1);
  };

  const drawSpiral = () => {
    const context = getContext();
    if (!context) return;
    context.beginPath();
    for (let step = 0; step <= 360; step += 1) {
      const angle = step * 0.1;
      const radius = 2 + step * 0.32;
      const x = WIDTH / 2 + Math.cos(angle) * radius;
      const y = HEIGHT / 2 + Math.sin(angle) * radius;
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    setStrokes((count) => count + 1);
  };

  const clear = () => {
    getContext()?.clearRect(0, 0, WIDTH, HEIGHT);
    setStrokes(0);
  };

  return (
    <div className="stack">
      <Panel title="Drawing pad" description="Draw with a mouse, pen or finger.">
        {unsupported ? (
          <Callout tone="warn" title="Canvas 2D is not available">
            This browser did not return a 2D context, so drawing is disabled.
          </Callout>
        ) : null}
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="use-ref-canvas-demo-canvas"
          role="img"
          aria-label={`Drawing canvas with ${strokes} stroke${strokes === 1 ? '' : 's'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
        />
        <div className="row">
          <label className="row" htmlFor={brushId}>
            Brush size: {brush}px
          </label>
          <input
            id={brushId}
            type="range"
            min={1}
            max={16}
            value={brush}
            onChange={(event) => setBrush(Number(event.target.value))}
          />
          <Button onClick={drawSpiral}>Draw a spiral</Button>
          <Button variant="danger" onClick={clear}>
            Clear
          </Button>
        </div>
        <p className="small muted" aria-live="polite">
          {strokes} stroke{strokes === 1 ? '' : 's'}
        </p>
      </Panel>
      <Callout title="Refs as the bridge to imperative APIs">
        React owns the <code>&lt;canvas&gt;</code> element; the pixels are yours. Event handlers
        reach the element through the ref and call the Canvas API directly. Keyboard users can use
        <em> Draw a spiral</em> to try the same code path.
      </Callout>
    </div>
  );
}
