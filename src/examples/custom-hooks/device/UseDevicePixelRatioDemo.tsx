import { useEffect, useRef } from 'react';
import { Callout, Panel, ValueTable } from '../../../components/ui';
import { useDevicePixelRatio } from '../../../hooks/device';

const CSS_WIDTH = 280;
const CSS_HEIGHT = 90;

/**
 * Draws the same picture twice: once with a backing store sized for the
 * current pixel ratio (crisp), once at 1× (blurry on HiDPI screens and when
 * zoomed in).
 */
function RatioCanvas({ ratio, label }: { ratio: number; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    canvas.width = Math.round(CSS_WIDTH * ratio);
    canvas.height = Math.round(CSS_HEIGHT * ratio);
    const styles = getComputedStyle(canvas);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, CSS_WIDTH, CSS_HEIGHT);
    // Theme colours come from the CSS variables (canvas cannot read them directly).
    const accent = styles.getPropertyValue('--accent').trim();
    const foreground = styles.getPropertyValue('--fg').trim();
    if (accent) context.strokeStyle = accent;
    context.lineWidth = 1;
    for (let x = 10; x < CSS_WIDTH; x += 12) {
      context.beginPath();
      context.moveTo(x, 10);
      context.lineTo(x + 30, CSS_HEIGHT - 30);
      context.stroke();
    }
    if (foreground) context.fillStyle = foreground;
    context.font = '16px system-ui, sans-serif';
    context.fillText(
      `${label} — backing store ${canvas.width}×${canvas.height}`,
      10,
      CSS_HEIGHT - 10,
    );
  }, [ratio, label]);

  return (
    <canvas
      ref={canvasRef}
      width={CSS_WIDTH}
      height={CSS_HEIGHT}
      style={{ width: CSS_WIDTH, height: CSS_HEIGHT, maxWidth: '100%' }}
      role="img"
      aria-label={`Canvas rendered at ${ratio}× pixel density`}
    />
  );
}

export default function UseDevicePixelRatioDemo() {
  const ratio = useDevicePixelRatio();

  return (
    <div className="stack">
      <Panel
        title="Pixel ratio"
        description="Zoom the page (Ctrl/⌘ + and −) or drag the window to another monitor."
      >
        <ValueTable
          label="Device pixel ratio"
          rows={{
            devicePixelRatio: ratio,
            'Physical pixels per CSS pixel': `${ratio * ratio} per px²`,
          }}
        />
      </Panel>
      <Panel title="Why it matters: canvas sharpness">
        <RatioCanvas ratio={ratio} label="Sized for DPR" />
        <RatioCanvas ratio={1} label="Always 1×" />
      </Panel>
      <Callout title="How the change is detected">
        There is no <code>devicepixelratiochange</code> event. The hook listens to the media query{' '}
        <code>(resolution: {ratio}dppx)</code>; when it stops matching, it re-subscribes with the
        new ratio.
      </Callout>
    </div>
  );
}
