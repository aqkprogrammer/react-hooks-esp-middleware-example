import { useCallback, useState } from 'react';

export interface LogEntry {
  id: number;
  time: string;
  message: string;
  tone?: 'info' | 'success' | 'warn' | 'error';
}

let nextId = 0;

/**
 * Append-only log for demos that need to show *when* things happen
 * (renders, effects, cleanups, network events).
 */
export function useEventLog(limit = 50) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const log = useCallback(
    (message: string, tone: LogEntry['tone'] = 'info') => {
      const time = new Date().toLocaleTimeString(undefined, { hour12: false });
      nextId += 1;
      const entry: LogEntry = { id: nextId, time, message, tone };
      setEntries((previous) => [entry, ...previous].slice(0, limit));
    },
    [limit],
  );
  const clear = useCallback(() => setEntries([]), []);
  return { entries, log, clear };
}
