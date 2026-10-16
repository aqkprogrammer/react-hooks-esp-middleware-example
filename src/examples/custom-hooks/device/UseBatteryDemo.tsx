import { Badge, Callout, Panel, ValueTable } from '../../../components/ui';
import { useBattery } from '../../../hooks/device';

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'unknown';
  if (seconds === 0) return 'now';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export default function UseBatteryDemo() {
  const { isSupported, loading, battery, error } = useBattery();

  return (
    <div className="stack">
      <Callout tone="warn" title="Privacy & compatibility">
        The Battery Status API only exists in Chromium-based browsers. Firefox removed it because
        precise battery readings were used to fingerprint users, and Safari never shipped it. Use it
        for hints such as “pause autoplay on low battery”, never for tracking.
      </Callout>
      {!isSupported ? (
        <Callout tone="warn" title="Not supported in this browser">
          <code>navigator.getBattery()</code> is not available here. A real app should simply skip
          battery-dependent behaviour.
        </Callout>
      ) : (
        <Panel title="Battery">
          {loading ? <p className="muted">Reading battery status…</p> : null}
          {error ? (
            <Callout tone="danger" title="Could not read the battery">
              {error.message}
            </Callout>
          ) : null}
          {battery ? (
            <>
              <label className="stack small">
                Level: {Math.round(battery.level * 100)}%
                <progress className="progress" max={1} value={battery.level} />
              </label>
              <ValueTable
                label="Battery status"
                rows={{
                  Charging: (
                    <Badge tone={battery.charging ? 'success' : 'neutral'}>
                      {battery.charging ? 'charging' : 'on battery'}
                    </Badge>
                  ),
                  'Time to full': formatSeconds(battery.chargingTime),
                  'Time to empty': formatSeconds(battery.dischargingTime),
                  'Low battery hint': battery.level < 0.2 && !battery.charging ? 'yes' : 'no',
                }}
              />
              <p className="small muted">Plug or unplug the charger to see the values update.</p>
            </>
          ) : null}
        </Panel>
      )}
    </div>
  );
}
