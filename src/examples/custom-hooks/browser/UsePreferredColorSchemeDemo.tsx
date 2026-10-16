import { useEffect, useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { usePreferredColorScheme, useReducedMotion } from '../../../hooks';

const TIPS = [
  'Effects synchronise with external systems; they are not lifecycle methods.',
  'Derive values during render instead of syncing them with an effect.',
  'Use useSyncExternalStore to subscribe to browser APIs without tearing.',
  'Keys reset state: change the key to remount a subtree.',
];

/**
 * Reads two user preferences. Change them in your OS settings, or in DevTools
 * → Rendering → “Emulate CSS media feature …”.
 */
export default function UsePreferredColorSchemeDemo() {
  const scheme = usePreferredColorScheme();
  const reducedMotion = useReducedMotion();
  return (
    <div className="stack">
      <Panel title="usePreferredColorScheme">
        <ValueTable
          rows={{
            'Preferred scheme': <Badge tone="info">{scheme}</Badge>,
            'Code theme a JS highlighter would load':
              scheme === 'dark'
                ? 'github-dark'
                : scheme === 'light'
                  ? 'github-light'
                  : 'CSS default',
          }}
        />
      </Panel>
      <Panel title="useReducedMotion" description="An auto-advancing tip carousel.">
        <p>
          Reduced motion:{' '}
          <Badge tone={reducedMotion ? 'warn' : 'neutral'}>
            {reducedMotion ? 'reduce' : 'no preference'}
          </Badge>
        </p>
        <TipCarousel reducedMotion={reducedMotion} />
      </Panel>
      <Callout title="CSS first">
        Styling by preference belongs in CSS (<code>@media (prefers-color-scheme: dark)</code>,{' '}
        <code>prefers-reduced-motion</code>). These hooks are for decisions JavaScript makes.
      </Callout>
    </div>
  );
}

function TipCarousel({ reducedMotion }: { reducedMotion: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Auto-advance only when the user has not asked for reduced motion, and
  // always offer a pause control (WCAG 2.2.2).
  const autoplay = !reducedMotion && !paused;

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => setIndex((value) => (value + 1) % TIPS.length), 4000);
    return () => clearInterval(id);
  }, [autoplay]);

  return (
    <div className="stack">
      <p className="card" aria-live={autoplay ? 'off' : 'polite'}>
        <span className="muted small">
          Tip {index + 1} of {TIPS.length}
        </span>
        <br />
        {TIPS[index]}
      </p>
      <div className="row">
        <Button onClick={() => setIndex((value) => (value - 1 + TIPS.length) % TIPS.length)}>
          Previous tip
        </Button>
        <Button onClick={() => setIndex((value) => (value + 1) % TIPS.length)}>Next tip</Button>
        <Button onClick={() => setPaused((value) => !value)} disabled={reducedMotion}>
          {paused ? 'Resume auto-advance' : 'Pause auto-advance'}
        </Button>
      </div>
      <p className="small muted">
        {reducedMotion
          ? 'Auto-advance is off because you prefer reduced motion.'
          : paused
            ? 'Auto-advance paused.'
            : 'Advancing every 4 seconds.'}
      </p>
    </div>
  );
}
