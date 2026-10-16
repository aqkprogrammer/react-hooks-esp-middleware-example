import type { LogEntry } from './useEventLog';
import { Button } from './Button';

export interface EventLogProps {
  entries: LogEntry[];
  onClear?: () => void;
  title?: string;
}

export function EventLog({ entries, onClear, title = 'Event log' }: EventLogProps) {
  return (
    <div className="event-log">
      <div className="event-log-header">
        <span className="event-log-title">{title}</span>
        {onClear ? (
          <Button size="sm" variant="ghost" onClick={onClear} disabled={entries.length === 0}>
            Clear log
          </Button>
        ) : null}
      </div>
      <ol className="event-log-list" role="log" aria-label={title}>
        {entries.length === 0 ? <li className="muted">Nothing logged yet.</li> : null}
        {entries.map((entry) => (
          <li key={entry.id} className={`log-${entry.tone ?? 'info'}`}>
            <span className="log-time">{entry.time}</span> {entry.message}
          </li>
        ))}
      </ol>
    </div>
  );
}
