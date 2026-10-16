import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useFullscreen } from '../../../hooks';
import './UseFullscreenDemo.css';

export default function UseFullscreenDemo() {
  const { ref, isFullscreen, isSupported, enter, exit, toggle, error } =
    useFullscreen<HTMLDivElement>();
  return (
    <div className="stack">
      <Panel
        title="Presentation stage"
        description="The controls live inside the element, so they stay reachable in full screen. Esc also exits."
      >
        <div ref={ref} className="use-fullscreen-demo-stage">
          <p>
            <strong>Slide 1</strong> — {isFullscreen ? 'presenting full screen' : 'inline preview'}
          </p>
          <div className="row">
            <Button
              variant="primary"
              onClick={() => void enter()}
              disabled={!isSupported || isFullscreen}
            >
              Enter full screen
            </Button>
            <Button onClick={() => void exit()} disabled={!isFullscreen}>
              Exit full screen
            </Button>
            <Button onClick={() => void toggle()} disabled={!isSupported}>
              Toggle
            </Button>
          </div>
        </div>
        <ValueTable
          rows={{
            isSupported: (
              <Badge tone={isSupported ? 'success' : 'warn'}>{String(isSupported)}</Badge>
            ),
            isFullscreen: String(isFullscreen),
          }}
        />
        {error ? (
          <Callout tone="danger" title="Request failed">
            {error.name}: {error.message}
          </Callout>
        ) : null}
        {isSupported ? null : (
          <Callout tone="warn" title="Full screen is unavailable here">
            Either the browser lacks the Fullscreen API (on iPhone, Safari only allows video
            elements to go full screen) or this page runs in an iframe without{' '}
            <code>allow=&quot;fullscreen&quot;</code>.
          </Callout>
        )}
      </Panel>
      <Callout title="Browser rules">
        <code>requestFullscreen()</code> only works during a user gesture (click, key press), and
        Safari before 16.4 needs the <code>webkit</code>-prefixed API, which the hook falls back to.
      </Callout>
    </div>
  );
}
