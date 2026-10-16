import { Activity, useEffect, useId, useState } from 'react';
import { Button, Callout, EventLog, Panel, TextField, useEventLog } from '../../../components/ui';

type Tab = 'compose' | 'timer';
type Strategy = 'activity' | 'conditional';

/**
 * `<Activity mode="hidden">` hides its children with `display: none`, keeps
 * their state and DOM, and cleans up their Effects; `mode="visible"` shows
 * them again and re-creates the Effects. Compare it with plain conditional
 * rendering, which unmounts the tab and throws its state away.
 */
export default function ActivityDemo() {
  const [tab, setTab] = useState<Tab>('compose');
  const [strategy, setStrategy] = useState<Strategy>('activity');
  const { entries, log, clear } = useEventLog();
  const strategyId = useId();

  return (
    <div className="stack">
      <Panel
        title="Tabs"
        description="Type a draft, switch to the Timer tab and back. Watch the effect log."
      >
        <div className="row">
          <label htmlFor={strategyId}>Hide inactive tabs with</label>
          <select
            id={strategyId}
            value={strategy}
            onChange={(event) => setStrategy(event.target.value as Strategy)}
          >
            <option value="activity">&lt;Activity mode=&quot;hidden&quot;&gt;</option>
            <option value="conditional">conditional rendering (unmount)</option>
          </select>
        </div>
        <div className="row" role="group" aria-label="Tabs">
          <Button
            aria-pressed={tab === 'compose'}
            variant={tab === 'compose' ? 'primary' : 'secondary'}
            onClick={() => setTab('compose')}
          >
            Compose
          </Button>
          <Button
            aria-pressed={tab === 'timer'}
            variant={tab === 'timer' ? 'primary' : 'secondary'}
            onClick={() => setTab('timer')}
          >
            Timer
          </Button>
        </div>
        {strategy === 'activity' ? (
          <>
            <Activity mode={tab === 'compose' ? 'visible' : 'hidden'} name="Compose tab">
              <ComposeTab />
            </Activity>
            <Activity mode={tab === 'timer' ? 'visible' : 'hidden'} name="Timer tab">
              <TimerTab onLog={log} />
            </Activity>
          </>
        ) : (
          <>
            {tab === 'compose' ? <ComposeTab /> : null}
            {tab === 'timer' ? <TimerTab onLog={log} /> : null}
          </>
        )}
      </Panel>
      <EventLog title="Effect log" entries={entries} onClear={clear} />
      <Callout title="Hidden is not unmounted">
        Hidden children keep their DOM, so side effects that live in the DOM (a playing{' '}
        <code>&lt;video&gt;</code>, an open <code>&lt;dialog&gt;</code>) keep going unless an Effect
        cleanup stops them. Hidden trees also re-render at low priority when their props change.
      </Callout>
    </div>
  );
}

function ComposeTab() {
  const [draft, setDraft] = useState('');
  return (
    <section className="card stack" aria-label="Compose tab">
      <TextField label="Draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <p className="small muted">{draft.length} characters kept in component state</p>
    </section>
  );
}

function TimerTab({
  onLog,
}: {
  onLog: (message: string, tone?: 'info' | 'success' | 'warn') => void;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    onLog('Timer effect: interval started', 'success');
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => {
      window.clearInterval(timer);
      onLog('Timer effect: cleaned up', 'warn');
    };
  }, [onLog]);
  return (
    <section className="card" aria-label="Timer tab">
      <p>
        Seconds while visible: <strong>{seconds}</strong>
      </p>
      <p className="small muted">The interval only runs while this tab is visible.</p>
    </section>
  );
}
