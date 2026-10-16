import { useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useTimeout } from '../../../hooks';

const DURATION = 4000;

/**
 * An auto-dismissing toast. Hovering or focusing it pauses the timer — WCAG
 * 2.2.2 asks that moving/auto-updating content can be paused.
 */
export default function UseTimeoutDemo() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(0);

  // A null delay disables the timer while the toast is hidden; showing it
  // changes the delay, which auto-starts the timeout.
  const timer = useTimeout(
    () => {
      setVisible(false);
      setDismissed((n) => n + 1);
    },
    visible ? DURATION : null,
  );

  return (
    <div className="stack">
      <Panel title="Toast" description={`Disappears after ${DURATION / 1000} s unless paused.`}>
        <div className="row">
          <Button variant="primary" onClick={() => (visible ? timer.reset() : setVisible(true))}>
            {visible ? 'Show again (reset timer)' : 'Show toast'}
          </Button>
          <Button onClick={timer.clear} disabled={!timer.isPending}>
            Keep open (clear)
          </Button>
          <Button onClick={timer.start} disabled={!visible || timer.isPending}>
            Resume (start)
          </Button>
        </div>
        <div role="status" aria-live="polite">
          {visible ? (
            <div
              onPointerEnter={timer.clear}
              onPointerLeave={timer.start}
              onFocus={timer.clear}
              onBlur={timer.start}
            >
              <Callout tone="success" title="Changes saved">
                <div className="spread">
                  <span>This message closes by itself.</span>
                  <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>
                    Dismiss
                  </Button>
                </div>
              </Callout>
            </div>
          ) : null}
        </div>
        <ValueTable
          label="Timer state"
          rows={{
            Timer: (
              <Badge tone={timer.isPending ? 'warn' : 'neutral'}>
                {timer.isPending ? 'pending' : 'idle'}
              </Badge>
            ),
            'Auto-dismissed': dismissed,
          }}
        />
      </Panel>
    </div>
  );
}
