import { useState } from 'react';
import { Badge, Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useGeolocation } from '../../../hooks';

/** Nothing is requested until you press a button. */
export default function UseGeolocationDemo() {
  const [highAccuracy, setHighAccuracy] = useState(false);
  const geo = useGeolocation({
    enableHighAccuracy: highAccuracy,
    timeout: 15_000,
    maximumAge: 60_000,
  });
  const coords = geo.position?.coords;

  return (
    <div className="stack">
      <Callout title="Privacy">
        Your position stays in this tab: it is not sent or stored anywhere. Coordinates are shown
        rounded to ~100 m. Real apps should ask only when a feature needs it and explain why.
      </Callout>
      <Panel title="Where am I?">
        <label className="row">
          <input
            type="checkbox"
            checked={highAccuracy}
            onChange={(event) => setHighAccuracy(event.target.checked)}
          />
          High accuracy (GPS — slower, uses more battery)
        </label>
        <div className="row">
          <Button
            variant="primary"
            onClick={geo.getCurrentPosition}
            disabled={!geo.isSupported || geo.loading}
          >
            Get my location
          </Button>
          <Button onClick={geo.watchPosition} disabled={!geo.isSupported || geo.isWatching}>
            Watch position
          </Button>
          <Button onClick={geo.clearWatch} disabled={!geo.isWatching}>
            Stop watching
          </Button>
        </div>
        <ValueTable
          rows={{
            Status: (
              <Badge
                tone={
                  geo.status === 'error' ? 'warn' : geo.status === 'success' ? 'success' : 'neutral'
                }
              >
                {geo.status}
              </Badge>
            ),
            Watching: String(geo.isWatching),
            Latitude: coords ? coords.latitude.toFixed(3) : '—',
            Longitude: coords ? coords.longitude.toFixed(3) : '—',
            Accuracy: coords ? `±${Math.round(coords.accuracy)} m` : '—',
            'Fix time': geo.position ? new Date(geo.position.timestamp).toLocaleTimeString() : '—',
          }}
        />
        {geo.isSupported ? null : (
          <Callout tone="warn">The Geolocation API is not available in this browser.</Callout>
        )}
        {geo.error ? (
          <Callout tone="danger" title={`Error: ${geo.error.kind}`}>
            {geo.isPermissionDenied
              ? 'Location access is blocked. Allow it in the site settings (the icon next to the address bar) and try again.'
              : geo.error.message}
          </Callout>
        ) : null}
      </Panel>
    </div>
  );
}
