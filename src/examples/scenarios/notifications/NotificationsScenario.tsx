import { useId, useState } from 'react';
import { Button, Callout, Panel } from '../../../components/ui';
import { useToasts } from './toastContext';
import { ToastProvider } from './ToastProvider';
import './NotificationsScenario.css';

const DURATIONS = [3000, 5000, 10_000] as const;

function NotificationControls() {
  const { notify } = useToasts();
  const [burst, setBurst] = useState(0);

  return (
    <div className="row">
      <Button onClick={() => notify({ tone: 'success', title: 'Draft saved' })}>Save draft</Button>
      <Button
        onClick={() =>
          notify({
            tone: 'info',
            title: 'Sync started',
            description: 'Your files will be up to date in a minute.',
          })
        }
      >
        Start sync
      </Button>
      <Button
        onClick={() =>
          notify({
            tone: 'warning',
            title: 'Storage almost full',
            description: '92% of your quota is used.',
          })
        }
      >
        Check storage
      </Button>
      <Button
        variant="danger"
        onClick={() =>
          notify({
            tone: 'error',
            title: 'Payment failed',
            description: 'The card was declined.',
            action: {
              label: 'Retry payment',
              onAction: () => notify({ tone: 'success', title: 'Payment succeeded' }),
            },
          })
        }
      >
        Charge card
      </Button>
      <Button
        onClick={() => {
          const start = burst;
          for (let index = 1; index <= 5; index += 1) {
            notify({ tone: 'info', title: `Message ${start + index} received` });
          }
          setBurst(start + 5);
        }}
      >
        Receive 5 messages
      </Button>
    </div>
  );
}

/**
 * A toast system: a context provider owns a queue of notifications that
 * auto-dismiss (pausing on hover, focus and hidden tabs), can be dismissed by
 * hand, never exceed a maximum visible stack, and are announced to screen
 * readers with the right politeness.
 */
export default function NotificationsScenario() {
  const [maxVisible, setMaxVisible] = useState(3);
  const [duration, setDuration] = useState<number>(5000);
  const maxId = useId();
  const durationId = useId();

  return (
    <div className="stack">
      <ToastProvider maxVisible={maxVisible} defaultDuration={duration}>
        <Panel
          title="Trigger notifications"
          description="Hover or focus a toast to pause every countdown. Errors stay until dismissed. Press Alt+T (⌥T on macOS) to jump to the notifications, Escape to dismiss the focused one."
        >
          <div className="row">
            <div className="field">
              <label className="field-label" htmlFor={maxId}>
                Max visible
              </label>
              <select
                id={maxId}
                value={maxVisible}
                onChange={(event) => setMaxVisible(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor={durationId}>
                Auto-dismiss after
              </label>
              <select
                id={durationId}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              >
                {DURATIONS.map((ms) => (
                  <option key={ms} value={ms}>
                    {ms / 1000} seconds
                  </option>
                ))}
              </select>
            </div>
          </div>
          <NotificationControls />
        </Panel>
      </ToastProvider>
      <Callout title="Accessible toasts">
        The visual stack is not a live region; each toast is announced once through{' '}
        <code>useAnnouncer</code> — errors assertively, the rest politely. Toasts that are not yet
        visible wait in a queue instead of being dropped, and nothing auto-dismisses while you are
        reading it (WCAG 2.2.1).
      </Callout>
    </div>
  );
}
