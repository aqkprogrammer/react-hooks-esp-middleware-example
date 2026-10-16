import { ViewTransition, addTransitionType, startTransition, useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import './ViewTransitionDemo.css';

const slides = [
  { id: 'hooks', title: 'Hooks', body: 'State and effects for function components (16.8).' },
  {
    id: 'concurrent',
    title: 'Concurrent rendering',
    body: 'Transitions and deferred values (18).',
  },
  { id: 'actions', title: 'Actions', body: 'Async transitions, forms and optimistic UI (19).' },
  { id: 'activity', title: 'Activity', body: 'Hide UI while keeping its state (19.2).' },
  { id: 'view-transitions', title: 'View Transitions', body: 'Animated updates, stable in 19.3.' },
] as const;

/**
 * `<ViewTransition>` (stable in React 19.3) animates its children with the
 * browser's View Transition API when they change *inside a Transition*.
 * `addTransitionType` labels the Transition so each direction can use a
 * different animation class.
 */
export default function ViewTransitionDemo() {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const slide = slides[index] ?? slides[0];
  const supported = typeof document !== 'undefined' && 'startViewTransition' in document;

  const go = (direction: 'forward' | 'backward') => {
    const next = (index + (direction === 'forward' ? 1 : slides.length - 1)) % slides.length;
    if (!animate) {
      setIndex(next); // urgent update: never animated
      return;
    }
    startTransition(() => {
      addTransitionType(direction);
      setIndex(next);
    });
  };

  return (
    <div className="stack">
      <Panel
        title="Slides"
        description="Next and Previous slide in from opposite sides; switch animations off to compare."
      >
        <div className="row">
          <Button onClick={() => go('backward')}>Previous</Button>
          <Button variant="primary" onClick={() => go('forward')}>
            Next
          </Button>
          <label className="row small">
            <input
              type="checkbox"
              checked={animate}
              onChange={(event) => setAnimate(event.target.checked)}
            />
            Update inside startTransition (animated)
          </label>
        </div>
        <div className="vt-stage">
          {/* A new key makes this an exit of the old slide and an enter of the new one. */}
          <ViewTransition
            key={slide.id}
            enter={{ forward: 'vt-from-right', backward: 'vt-from-left', default: 'auto' }}
            exit={{ forward: 'vt-to-left', backward: 'vt-to-right', default: 'auto' }}
            default="none"
          >
            <article className="card vt-slide" aria-live="polite" aria-label="Current slide">
              <span className="small muted">
                Slide {index + 1} of {slides.length}
              </span>
              <h4 className="vt-title">{slide.title}</h4>
              <p>{slide.body}</p>
            </article>
          </ViewTransition>
        </div>
        <p className="small">
          {supported ? (
            <Badge tone="success">This browser supports the View Transition API</Badge>
          ) : (
            <Badge tone="warn">No View Transition API here — updates apply without animation</Badge>
          )}
        </p>
      </Panel>
      <Callout title="Only Transitions animate">
        Plain <code>setState</code> is urgent and commits immediately, so it never animates. Updates
        in <code>startTransition</code>, <code>useDeferredValue</code> and Suspense reveals do.
        Animations are disabled for users who prefer reduced motion.
      </Callout>
    </div>
  );
}
