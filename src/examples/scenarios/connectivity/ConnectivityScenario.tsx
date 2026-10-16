import { Callout } from '../../../components/ui';
import { ConnectivityLab } from './ConnectivityLab';
import './ConnectivityScenario.css';

/**
 * Offline-tolerant writes: an offline banner (useOnlineStatus), connection
 * hints (useNetworkInformation), and a persisted outbox replayed on reconnect.
 */
export default function ConnectivityScenario() {
  return (
    <div className="stack">
      <ConnectivityLab />
      <Callout title="What “online” really means">
        <code>navigator.onLine === false</code> is reliable: the device has no network. But{' '}
        <code>true</code> only means “some network”, not “the server is reachable” — so a failed
        request (a <code>TypeError</code> from <code>fetch</code>) also sends the action to the
        outbox. Each queued action carries an <code>Idempotency-Key</code> so a replay that reaches
        the server twice (two tabs, a lost response) can be de-duplicated there.
      </Callout>
    </div>
  );
}
