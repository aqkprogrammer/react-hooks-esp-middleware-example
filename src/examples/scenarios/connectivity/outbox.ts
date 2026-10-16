/** The persisted "outbox": actions recorded while offline, replayed in order later. */
import { fetchJson, HttpError, isTransientError } from '../../../hooks';

export interface QueuedTodo {
  /** Client-generated id, also sent as the `Idempotency-Key` header. */
  id: string;
  title: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface SyncedTodo {
  id: string;
  title: string;
}

export const OUTBOX_KEY = 'scenario:connectivity:outbox';
/** After this many failed replays an action is moved to "needs attention". */
export const MAX_ATTEMPTS = 3;

export function isOutbox(value: unknown): value is QueuedTodo[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as QueuedTodo).id === 'string' &&
        typeof (item as QueuedTodo).title === 'string' &&
        typeof (item as QueuedTodo).createdAt === 'number' &&
        typeof (item as QueuedTodo).attempts === 'number',
    )
  );
}

let sequence = 0;
export function createQueuedTodo(title: string, now = Date.now()): QueuedTodo {
  sequence += 1;
  return { id: `local-${now.toString(36)}-${sequence}`, title, createdAt: now, attempts: 0 };
}

export function postTodo(
  item: Pick<QueuedTodo, 'id' | 'title'>,
  signal: AbortSignal,
  delayMs?: number,
): Promise<SyncedTodo> {
  const url = delayMs === undefined ? '/api/todos' : `/api/todos?delay=${delayMs}`;
  return fetchJson<SyncedTodo>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Idempotency-Key': item.id },
    body: JSON.stringify({ title: item.title }),
    signal,
  });
}

/** A failed fetch (TypeError) means "no connection": keep the action for later. */
export const isNetworkFailure = (error: unknown) => error instanceof TypeError;

/** Should a failed replay be kept for another attempt? */
export function shouldKeep(error: unknown, attempts: number): boolean {
  if (attempts >= MAX_ATTEMPTS) return false;
  if (error instanceof HttpError) return isTransientError(error);
  return true;
}

export const describeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
