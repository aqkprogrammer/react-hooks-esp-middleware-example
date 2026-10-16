import { Badge, Callout, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useEventListener, useNetworkInformation, useOnlineStatus } from '../../../hooks';

/**
 * `useOnlineStatus` plus the (Chromium-only) Network Information API. In
 * DevTools → Network, switch throttling to “Offline” or “Slow 3G” to see both
 * update.
 */
export default function UseOnlineStatusDemo() {
  const online = useOnlineStatus();
  const network = useNetworkInformation();
  const { entries, log, clear } = useEventLog(20);
  useEventListener('online', () => log('online event', 'success'));
  useEventListener('offline', () => log('offline event', 'warn'));

  return (
    <div className="stack">
      <Panel
        title="useOnlineStatus"
        description="Toggle offline mode in DevTools (Network → Offline) or disconnect Wi-Fi."
      >
        <p role="status">
          Connection:{' '}
          <Badge tone={online ? 'success' : 'warn'}>{online ? 'online' : 'offline'}</Badge>
        </p>
        {online ? null : (
          <Callout tone="warn" title="You are offline">
            Changes are kept locally and will sync when the connection returns.
          </Callout>
        )}
        <EventLog entries={entries} onClear={clear} />
        <Callout title="“Online” is not “internet works”">
          <code>navigator.onLine === true</code> only means the device has a network connection — a
          captive portal or a router without upstream still counts. Offline is reliable; for online,
          trust the outcome of your real requests.
        </Callout>
      </Panel>
      <Panel title="useNetworkInformation">
        <p>
          API support:{' '}
          <Badge tone={network.isSupported ? 'success' : 'warn'}>
            {network.isSupported ? 'supported' : 'not supported'}
          </Badge>
        </p>
        {network.isSupported ? (
          <ValueTable
            label="Connection estimates"
            rows={{
              effectiveType: network.effectiveType ?? '—',
              downlink: network.downlink !== undefined ? `${network.downlink} Mbit/s` : '—',
              rtt: network.rtt !== undefined ? `${network.rtt} ms` : '—',
              saveData: String(network.saveData ?? false),
              type: network.type ?? 'not exposed on this platform',
            }}
          />
        ) : (
          <Callout tone="warn" title="Chromium only">
            Firefox and Safari do not implement <code>navigator.connection</code>. Treat these
            values as an optional hint (e.g. serve lighter media when <code>saveData</code> is on),
            never as a requirement.
          </Callout>
        )}
      </Panel>
    </div>
  );
}
