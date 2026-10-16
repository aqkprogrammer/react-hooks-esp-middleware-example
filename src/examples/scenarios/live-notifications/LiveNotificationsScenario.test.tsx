import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ws } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { LIVE_SOCKET_URL } from '../../../mocks/handlers';
import { server } from '../../../test/server';
import LiveNotificationsScenario from './LiveNotificationsScenario';
import { addNotification, MAX_NOTIFICATIONS, parseServerMessage } from './messages';

const live = ws.link(LIVE_SOCKET_URL);
const politeRegion = () => document.querySelector('[data-live-announcer="polite"]');

async function connected() {
  const user = userEvent.setup();
  render(<LiveNotificationsScenario />);
  expect(await screen.findByText('Connected')).toBeInTheDocument();
  return user;
}

async function sendNotification(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByLabelText('Notification text');
  await user.clear(input);
  await user.type(input, text);
  await user.click(screen.getByRole('button', { name: 'Send test notification' }));
  return within(await screen.findByRole('list', { name: 'Notifications' })).findByText(text);
}

describe('LiveNotificationsScenario', () => {
  it('receives notifications, counts unread ones and announces them', async () => {
    const user = await connected();
    expect(screen.getByRole('heading', { name: 'Notifications (0 unread)' })).toBeInTheDocument();

    await sendNotification(user, 'Deploy finished');
    await sendNotification(user, 'Build #43 failed');
    expect(screen.getByRole('heading', { name: 'Notifications (2 unread)' })).toBeInTheDocument();
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent('New notification: Build #43 failed'),
    );
    // Newest first.
    const items = within(screen.getByRole('list', { name: 'Notifications' })).getAllByRole(
      'listitem',
    );
    expect(items[0]).toHaveTextContent('Build #43 failed');
  });

  it('marks one or all notifications as read', async () => {
    const user = await connected();
    await sendNotification(user, 'First');
    await sendNotification(user, 'Second');

    await user.click(screen.getByRole('button', { name: 'Mark “First” as read' }));
    expect(screen.getByRole('heading', { name: 'Notifications (1 unread)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(screen.getByRole('heading', { name: 'Notifications (0 unread)' })).toBeInTheDocument();
    expect(screen.queryByText('New')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
  });

  it('disconnects on request and reconnects', async () => {
    const user = await connected();
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(await screen.findByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(await screen.findByText('Connected')).toBeInTheDocument();
    await sendNotification(user, 'Back online');
  });

  it('reconnects automatically after the server drops the connection', async () => {
    let connections = 0;
    server.use(
      live.addEventListener('connection', ({ client }) => {
        connections += 1;
        if (connections === 1) setTimeout(() => client.close(4000, 'server restart'), 5);
      }),
    );
    render(<LiveNotificationsScenario />);
    expect(await screen.findByText(/Reconnecting \(attempt 1 of 5\)/)).toBeInTheDocument();
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent('Notifications connection lost. Reconnecting…'),
    );
    expect(await screen.findByText('Connected', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(connections).toBe(2);
  });

  it('ignores malformed and non-notification frames', async () => {
    server.use(
      live.addEventListener('connection', ({ client }) => {
        setTimeout(() => {
          client.send('not json');
          client.send(JSON.stringify({ type: 'notification', text: 42 }));
          client.send(JSON.stringify({ type: 'notification', id: 'x', text: 'Valid', at: 1 }));
          client.send(JSON.stringify({ type: 'notification', id: 'x', text: 'Valid', at: 1 }));
        }, 5);
      }),
    );
    render(<LiveNotificationsScenario />);
    const list = await screen.findByRole('list', { name: 'Notifications' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Notifications (1 unread)' })).toBeInTheDocument();
  });

  it('explains when WebSocket is unavailable', () => {
    vi.stubGlobal('WebSocket', undefined);
    render(<LiveNotificationsScenario />);
    expect(screen.getByText('WebSocket unavailable')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });
});

describe('notification messages', () => {
  it('parses only well-formed frames', () => {
    expect(parseServerMessage('{"type":"pong","at":1}')).toEqual({ type: 'pong', at: 1 });
    expect(parseServerMessage('{"type":"other"}')).toBeNull();
    expect(parseServerMessage(new ArrayBuffer(2))).toBeNull();
  });

  it('caps the list', () => {
    let list: ReturnType<typeof addNotification> = [];
    for (let i = 0; i < MAX_NOTIFICATIONS + 5; i += 1) {
      list = addNotification(list, { type: 'notification', id: String(i), text: 't', at: i });
    }
    expect(list).toHaveLength(MAX_NOTIFICATIONS);
    expect(list[0]?.id).toBe(String(MAX_NOTIFICATIONS + 4));
  });
});
