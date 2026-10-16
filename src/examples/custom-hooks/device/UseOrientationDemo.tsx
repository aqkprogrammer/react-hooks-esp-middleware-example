import { Badge, Callout, Panel, ValueTable } from '../../../components/ui';
import { useOrientation } from '../../../hooks/device';

const sourceLabels = {
  'screen-orientation': 'Screen Orientation API (screen.orientation)',
  'media-query': 'Fallback: (orientation: portrait) media query',
  none: 'None',
} as const;

export default function UseOrientationDemo() {
  const orientation = useOrientation();

  if (!orientation.isSupported) {
    return (
      <Callout tone="warn" title="Not supported in this browser">
        Neither <code>screen.orientation</code> nor <code>matchMedia</code> is available, so the
        orientation cannot be detected. Layouts should not depend on it.
      </Callout>
    );
  }

  return (
    <div className="stack">
      <Panel
        title="Current orientation"
        description="Rotate your phone or tablet. On a desktop, the fallback follows the window's aspect ratio — try making the window narrow."
      >
        <ValueTable
          label="Orientation"
          rows={{
            Type: <code>{orientation.type ?? '—'}</code>,
            Angle: orientation.angle === null ? 'not available' : `${orientation.angle}°`,
            Shape: <Badge tone="info">{orientation.isPortrait ? 'portrait' : 'landscape'}</Badge>,
            Source: sourceLabels[orientation.source],
          }}
        />
      </Panel>
      <Callout title="No permission needed">
        Reading the orientation is free. Locking it (<code>screen.orientation.lock()</code>) only
        works in fullscreen on some mobile browsers, so it is not part of this hook.
      </Callout>
    </div>
  );
}
