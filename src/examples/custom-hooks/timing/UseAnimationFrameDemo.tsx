import { useRef, useState } from 'react';
import { Button, Panel, TextField, ValueTable } from '../../../components/ui';
import { useAnimationFrame, useMediaQuery } from '../../../hooks';
import './UseAnimationFrameDemo.css';

const BALL_SIZE = 32;

/**
 * The ball is moved by writing `style.transform` from the frame callback —
 * no React render per frame. React state is only updated twice a second for
 * the FPS readout.
 */
export default function UseAnimationFrameDemo() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [paused, setPaused] = useState(reducedMotion);
  const [speed, setSpeed] = useState(200);
  const [stats, setStats] = useState({ fps: 0, frames: 0 });

  const trackRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const motion = useRef({ x: 0, direction: 1, frames: 0, elapsed: 0, total: 0 });

  useAnimationFrame(
    (deltaMs) => {
      const state = motion.current;
      const width = (trackRef.current?.clientWidth ?? 0) - BALL_SIZE;
      state.x += state.direction * speed * (deltaMs / 1000);
      if (state.x >= width || state.x <= 0) {
        state.direction *= -1;
        state.x = Math.min(Math.max(state.x, 0), Math.max(width, 0));
      }
      if (ballRef.current) ballRef.current.style.transform = `translateX(${state.x}px)`;

      state.frames += 1;
      state.total += 1;
      state.elapsed += deltaMs;
      if (state.elapsed >= 500) {
        const fps = Math.round((state.frames * 1000) / state.elapsed);
        setStats({ fps, frames: state.total });
        state.frames = 0;
        state.elapsed = 0;
      }
    },
    { paused },
  );

  return (
    <div className="stack">
      <Panel
        title="Frame-rate independent motion"
        description="position += speed × deltaTime, so the ball moves at the same speed at 30 or 120 fps."
      >
        <div ref={trackRef} className="use-animation-frame-track">
          <div ref={ballRef} className="use-animation-frame-ball" aria-hidden="true" />
        </div>
        <div className="row">
          <Button variant="primary" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? 'Play' : 'Pause'}
          </Button>
          <TextField
            label="Speed (px/s)"
            type="number"
            min={0}
            step={50}
            value={speed}
            onChange={(event) => setSpeed(Math.max(0, Number(event.target.value) || 0))}
          />
        </div>
        <ValueTable
          label="Animation stats"
          rows={{
            State: paused ? 'paused' : 'running',
            FPS: stats.fps,
            'Frames rendered': stats.frames,
            'Reduced motion preferred': String(reducedMotion),
          }}
        />
      </Panel>
    </div>
  );
}
