import { Callout } from '../../components/ui';
import { EspDemo } from '../../esp-demo/EspDemo';

/** The repository's original example, running on React 19 + esp-js 8. */
export default function EspOriginalWorkspaceDemo() {
  return (
    <div className="stack">
      <Callout title="How to read this demo">
        Every tile is a <code>useReducer</code>-style store with its own esp-js model. Buttons and
        the <kbd className="kbd">Insert</kbd>/<kbd className="kbd">Delete</kbd> keys dispatch{' '}
        <code>ESP_BROADCAST_ACTION</code> / <code>ESP_PUBLISH_ACTION</code>; the ESP middleware
        routes them through the router and the bridge feeds the final-stage events back into the
        reducers. Watch the inspector below the workspace.
      </Callout>
      <EspDemo />
    </div>
  );
}
