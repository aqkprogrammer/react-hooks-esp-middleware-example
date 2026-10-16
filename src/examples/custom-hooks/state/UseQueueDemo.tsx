import { useState } from 'react';
import { Button, EventLog, Panel, ValueTable, show, useEventLog } from '../../../components/ui';
import { useQueue } from '../../../hooks';

export default function UseQueueDemo() {
  const queue = useQueue<string>(['Job #1', 'Job #2']);
  const [nextJob, setNextJob] = useState(3);
  const { entries, log, clear } = useEventLog();

  const processNext = () => {
    const job = queue.dequeue();
    log(job === undefined ? 'Queue is empty' : `Processed ${job}`, job ? 'success' : 'warn');
  };

  return (
    <div className="stack">
      <Panel
        title="Print queue"
        description="dequeue() returns the removed job synchronously — even twice in one click."
      >
        <ol className="list" aria-label="Queued jobs">
          {queue.size === 0 ? <li className="muted">Empty.</li> : null}
          {queue.items.map((job, index) => (
            <li key={`${job}-${index}`}>{job}</li>
          ))}
        </ol>
        <div className="row">
          <Button
            variant="primary"
            onClick={() => {
              queue.enqueue(`Job #${nextJob}`);
              setNextJob((n) => n + 1);
            }}
          >
            Enqueue job
          </Button>
          <Button onClick={processNext} disabled={queue.size === 0}>
            Process next
          </Button>
          <Button
            onClick={() => {
              processNext();
              processNext();
            }}
            disabled={queue.size === 0}
          >
            Process two at once
          </Button>
          <Button onClick={() => log(`peek() → ${show(queue.peek())}`)}>Peek</Button>
          <Button variant="ghost" onClick={queue.clear} disabled={queue.size === 0}>
            Clear
          </Button>
        </div>
        <ValueTable
          label="Queue state"
          rows={{ size: queue.size, first: show(queue.first), last: show(queue.last) }}
        />
        <EventLog entries={entries} onClear={clear} />
      </Panel>
    </div>
  );
}
