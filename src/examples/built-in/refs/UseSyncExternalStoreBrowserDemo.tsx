import { useState, useSyncExternalStore } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import {
  getOnlineServerSnapshot,
  getOnlineSnapshot,
  getVisibilityServerSnapshot,
  getVisibilitySnapshot,
  subscribeOnline,
  subscribeVisibility,
} from './browserStores';

function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
}

function usePageVisibility(): DocumentVisibilityState {
  return useSyncExternalStore(
    subscribeVisibility,
    getVisibilitySnapshot,
    getVisibilityServerSnapshot,
  );
}

/**
 * Subscribing to browser state: `navigator.onLine` and
 * `document.visibilityState`, with server snapshots for SSR.
 */
export default function UseSyncExternalStoreBrowserDemo() {
  return (
    <div className="stack">
      <div className="grid">
        <Panel
          title="Network status"
          description="Toggle “Offline” in your browser's DevTools network panel."
        >
          <OnlineBadge />
        </Panel>
        <Panel title="Page visibility" description="Switch to another tab and back.">
          <VisibilityReadout />
        </Panel>
      </div>
      <Panel title="A second, independent subscriber">
        <SaveButton />
      </Panel>
      <Callout title="SSR and hydration">
        On the server React calls <code>getServerSnapshot</code> (here: online, visible) and uses it
        again during hydration so the markup matches. Right after hydration it switches to{' '}
        <code>getSnapshot</code> and re-renders if the real value differs. Without a{' '}
        <code>getServerSnapshot</code>, server rendering this component throws.
      </Callout>
    </div>
  );
}

function OnlineBadge() {
  const online = useOnlineStatus();
  return (
    <p role="status">
      <Badge tone={online ? 'success' : 'warn'}>{online ? 'Online' : 'Offline'}</Badge>
    </p>
  );
}

function VisibilityReadout() {
  const visibility = usePageVisibility();
  return <ValueTable label="Visibility" rows={{ 'document.visibilityState': visibility }} />;
}

function SaveButton() {
  const online = useOnlineStatus();
  const [saves, setSaves] = useState(0);
  return (
    <div className="stack">
      <div className="row">
        <Button variant="primary" disabled={!online} onClick={() => setSaves((count) => count + 1)}>
          {online ? 'Save changes' : 'Reconnecting…'}
        </Button>
        <span className="small" aria-live="polite">
          {saves === 0 ? 'Nothing saved yet' : `Saved ${saves} time${saves === 1 ? '' : 's'}`}
        </span>
      </div>
      <p className="small muted">Both components share one store and update together.</p>
    </div>
  );
}
