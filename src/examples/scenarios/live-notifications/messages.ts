/** Messages the live socket can send (see LIVE_SOCKET_URL in src/mocks/handlers.ts). */
export type ServerMessage =
  | { type: 'welcome'; at: number }
  | { type: 'notification'; id: string; text: string; at: number }
  | { type: 'pong'; at: number }
  | { type: 'error'; message: string };

export interface AppNotification {
  id: string;
  text: string;
  at: number;
  read: boolean;
}

/** Keep the list bounded: a chatty server must not grow memory forever. */
export const MAX_NOTIFICATIONS = 50;

/**
 * Socket data is untrusted input: parse and check it instead of casting.
 * Unknown or malformed frames become `null` and are ignored.
 */
export function parseServerMessage(data: unknown): ServerMessage | null {
  if (typeof data !== 'string') return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const message = value as Record<string, unknown>;
  switch (message.type) {
    case 'notification':
      return typeof message.id === 'string' &&
        typeof message.text === 'string' &&
        typeof message.at === 'number'
        ? { type: 'notification', id: message.id, text: message.text, at: message.at }
        : null;
    case 'welcome':
    case 'pong':
      return typeof message.at === 'number' ? { type: message.type, at: message.at } : null;
    case 'error':
      return typeof message.message === 'string'
        ? { type: 'error', message: message.message }
        : null;
    default:
      return null;
  }
}

/** Adds a notification once (servers may redeliver after a reconnect), newest first. */
export function addNotification(
  list: AppNotification[],
  message: Extract<ServerMessage, { type: 'notification' }>,
): AppNotification[] {
  if (list.some((item) => item.id === message.id)) return list;
  return [{ id: message.id, text: message.text, at: message.at, read: false }, ...list].slice(
    0,
    MAX_NOTIFICATIONS,
  );
}
