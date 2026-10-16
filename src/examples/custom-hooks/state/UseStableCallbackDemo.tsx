import { memo, useCallback, useState } from 'react';
import {
  Button,
  EventLog,
  Panel,
  RenderCount,
  TextField,
  useEventLog,
} from '../../../components/ui';
import { useStableCallback } from '../../../hooks';

/**
 * Memoized, and the memo boundary sits *above* the Profiler, so the commit
 * count only grows when `onSend` changes identity.
 */
const SendRow = memo(function SendRow({
  title,
  label,
  onSend,
}: {
  title: string;
  label: string;
  onSend: () => void;
}) {
  return (
    <RenderCount label={title}>
      <Button onClick={onSend}>{label}</Button>
    </RenderCount>
  );
});

/**
 * Three memoized buttons receive a "send the message" handler. Type in the
 * field and compare how often each one commits.
 */
export default function UseStableCallbackDemo() {
  const [message, setMessage] = useState('');
  const { entries, log, clear } = useEventLog();

  const inline = () => log(`inline: "${message}"`);
  const memoized = useCallback(() => log(`useCallback: "${message}"`), [log, message]);
  const stable = useStableCallback(() => log(`useStableCallback: "${message}"`, 'success'));

  return (
    <div className="stack">
      <Panel title="Parent state" description="Each keystroke re-renders the parent.">
        <TextField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </Panel>
      <Panel title="Memoized children">
        <div className="grid">
          <SendRow title="Inline arrow" label="Send (inline)" onSend={inline} />
          <SendRow title="useCallback([message])" label="Send (useCallback)" onSend={memoized} />
          <SendRow title="useStableCallback" label="Send (stable)" onSend={stable} />
        </div>
        <p className="small muted">
          All three log the latest message, but only the stable callback lets the memoized button
          skip re-rendering. On React 19.2+, use <code>useEffectEvent</code> for logic called from
          Effects.
        </p>
        <EventLog entries={entries} onClear={clear} />
      </Panel>
    </div>
  );
}
