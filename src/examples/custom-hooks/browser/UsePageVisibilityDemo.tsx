import { useEffect, useState } from 'react';
import { Badge, Callout, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useEventListener, usePageVisibility } from '../../../hooks';

/** A timer that only counts while the tab is visible. Switch tabs and come back. */
export default function UsePageVisibilityDemo() {
  const isVisible = usePageVisibility();
  const [activeSeconds, setActiveSeconds] = useState(0);
  const { entries, log, clear } = useEventLog(20);

  // Pause work in background tabs: the interval only exists while visible.
  useEffect(() => {
    if (!isVisible) return;
    const id = setInterval(() => setActiveSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(id);
  }, [isVisible]);

  useEventListener(
    'visibilitychange',
    () => log(`visibilitychange → ${document.visibilityState}`),
    document,
  );

  return (
    <div className="stack">
      <Panel
        title="Active time"
        description="Switch to another tab for a few seconds, then return."
      >
        <ValueTable
          rows={{
            'Page visible': (
              <Badge tone={isVisible ? 'success' : 'warn'}>
                {isVisible ? 'visible' : 'hidden'}
              </Badge>
            ),
            'Seconds visible': activeSeconds,
          }}
        />
        <EventLog entries={entries} onClear={clear} />
      </Panel>
      <Callout title="Typical uses">
        Pause polling, video and animations in background tabs; flush analytics with{' '}
        <code>navigator.sendBeacon</code> when the page becomes hidden (the last reliable moment on
        mobile).
      </Callout>
    </div>
  );
}
