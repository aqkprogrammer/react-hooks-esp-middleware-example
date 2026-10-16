import { memo, useRef, useState } from 'react';
import { Button, Callout, EventLog, Panel, RenderCount, useEventLog } from '../../../components/ui';

/**
 * Side by side: a counter in state re-renders on every click; a counter in a
 * ref changes silently. Both values are real — only one is wired to the UI.
 */
export default function UseRefVsStateDemo() {
  const { entries, log, clear } = useEventLog(20);
  return (
    <div className="stack">
      <Counters log={log} />
      <EventLog entries={entries} onClear={clear} title="Ref reads" />
      <Callout title="Choosing">
        Use state for anything the UI shows. Use a ref for values only event handlers or effects
        need — timer ids, the latest props for a subscription, a DOM node, an instance of a
        non-React library. Refs must not be read or written during render.
      </Callout>
    </div>
  );
}

/**
 * memo(): adding a log entry re-renders the page component. Without memo the
 * RenderCount wrappers (and the counters) would re-render too and the commit
 * numbers would no longer isolate the counters' own updates.
 */
const Counters = memo(function Counters({ log }: { log: (message: string) => void }) {
  return (
    <div className="grid">
      <Panel title="useState counter" description="Setting state schedules a re-render.">
        <RenderCount label="State counter">
          <StateCounter />
        </RenderCount>
      </Panel>
      <Panel title="useRef counter" description="Mutating a ref does not re-render.">
        <RenderCount label="Ref counter">
          <RefCounter log={log} />
        </RenderCount>
      </Panel>
    </div>
  );
});

function StateCounter() {
  const [count, setCount] = useState(0);
  return (
    <div className="stack">
      <p aria-label="State count">Clicked {count} times</p>
      <Button variant="primary" onClick={() => setCount((c) => c + 1)}>
        Increment state
      </Button>
    </div>
  );
}

function RefCounter({ log }: { log: (message: string) => void }) {
  const countRef = useRef(0);
  return (
    <div className="stack">
      <p className="muted">
        The count is not shown: rendering it would mean reading a ref during render.
      </p>
      <div className="row">
        <Button
          variant="primary"
          onClick={() => {
            countRef.current += 1; // no re-render
          }}
        >
          Increment ref
        </Button>
        <Button onClick={() => log(`countRef.current is ${countRef.current}`)}>Read the ref</Button>
      </div>
    </div>
  );
}
