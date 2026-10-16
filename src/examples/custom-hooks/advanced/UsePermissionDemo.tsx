import { useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { usePermission, type PermissionQueryName } from '../../../hooks/advanced';

const tone = {
  granted: 'success',
  denied: 'warn',
  prompt: 'info',
  pending: 'neutral',
  unsupported: 'neutral',
  error: 'neutral',
} as const;

function PermissionRow({
  name,
  action,
}: {
  name: PermissionQueryName;
  action?: { label: string; run: () => Promise<string> };
}) {
  const permission = usePermission(name);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <li className="spread">
      <span>
        <code>{name}</code>{' '}
        <Badge tone={tone[permission.status]}>
          {permission.status === 'error' ? 'not queryable here' : permission.status}
        </Badge>
        {message ? <span className="small muted"> — {message}</span> : null}
      </span>
      {action ? (
        <Button
          size="sm"
          disabled={permission.state === 'granted' || permission.state === 'denied'}
          onClick={() => {
            action
              .run()
              .then(setMessage, (error: unknown) =>
                setMessage(error instanceof Error ? error.message : String(error)),
              );
          }}
        >
          {action.label}
        </Button>
      ) : null}
    </li>
  );
}

const requestGeolocation = () =>
  new Promise<string>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not available'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve('position received (not shown)'),
      (error) => reject(new Error(error.message)),
      { maximumAge: 60_000, timeout: 15_000 },
    );
  });

const requestNotifications = async () => {
  if (typeof Notification === 'undefined') throw new Error('Notifications are not available');
  return `answer: ${await Notification.requestPermission()}`;
};

export default function UsePermissionDemo() {
  const probe = usePermission('geolocation');

  if (!probe.isSupported) {
    return (
      <Callout tone="warn" title="Not supported in this browser">
        <code>navigator.permissions</code> is missing. Ask for a permission with the feature&apos;s
        own API and handle the result instead.
      </Callout>
    );
  }

  return (
    <div className="stack">
      <Callout title="Reading never prompts">
        The badges come from <code>navigator.permissions.query()</code>, which only reads the state.
        Prompts appear only when you press a button. Change a permission in the site settings (the
        icon left of the address bar) and the badge updates live.
      </Callout>
      <Panel title="Permissions">
        <ul className="list">
          <PermissionRow
            name="geolocation"
            action={{ label: 'Request location', run: requestGeolocation }}
          />
          <PermissionRow
            name="notifications"
            action={{ label: 'Request notifications', run: requestNotifications }}
          />
          <PermissionRow name="camera" />
          <PermissionRow name="microphone" />
          <PermissionRow name="clipboard-read" />
        </ul>
        <p className="small muted">
          “not queryable here” means this browser rejects that permission name — e.g. Firefox and
          Safari support fewer names than Chromium.
        </p>
      </Panel>
    </div>
  );
}
