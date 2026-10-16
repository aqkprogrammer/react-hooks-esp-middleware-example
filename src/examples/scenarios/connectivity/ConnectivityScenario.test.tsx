import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { overrideProperty, setOnline } from '../../../test/browserMocks';
import { server } from '../../../test/server';
import { ConnectivityLab } from './ConnectivityLab';
import ConnectivityScenario from './ConnectivityScenario';
import { MAX_ATTEMPTS, OUTBOX_KEY, createQueuedTodo, isOutbox, shouldKeep } from './outbox';
import { HttpError } from '../../../hooks';

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length) restores.pop()?.();
});

const banner = () => screen.getAllByRole('status')[0];
const stored = () => {
  const raw = window.localStorage.getItem(OUTBOX_KEY);
  return raw ? (JSON.parse(raw) as { __v: number; value: Array<{ title: string }> }).value : [];
};

function trackTodoPosts() {
  const keys: string[] = [];
  server.events.on('request:start', ({ request }) => {
    if (request.method === 'POST' && new URL(request.url).pathname === '/api/todos') {
      keys.push(request.headers.get('idempotency-key') ?? '');
    }
  });
  return keys;
}

async function addTodo(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.type(screen.getByLabelText('Title'), title);
  await user.click(screen.getByRole('button', { name: 'Add todo' }));
}

describe('outbox helpers', () => {
  it('validates persisted data and decides what to keep', () => {
    const item = createQueuedTodo('a', 1);
    expect(isOutbox([item])).toBe(true);
    expect(isOutbox([{ title: 'no id' }])).toBe(false);
    expect(isOutbox('nope')).toBe(false);
    const serverError = new HttpError({ status: 500, statusText: '', url: '' }, null);
    const badRequest = new HttpError({ status: 422, statusText: '', url: '' }, null);
    expect(shouldKeep(serverError, 1)).toBe(true);
    expect(shouldKeep(serverError, MAX_ATTEMPTS)).toBe(false);
    expect(shouldKeep(badRequest, 1)).toBe(false);
    expect(shouldKeep(new TypeError('Failed to fetch'), 1)).toBe(true);
  });
});

describe('ConnectivityLab', () => {
  it('sends directly while online', async () => {
    const user = userEvent.setup();
    render(<ConnectivityLab requestDelayMs={0} />);
    await addTodo(user, 'Write tests');
    const synced = await screen.findByRole('list', { name: 'Synced todos' });
    expect(synced).toHaveTextContent('Write tests');
    expect(banner()).toHaveTextContent('All changes synced.');
  });

  it('queues while simulated offline, persists the queue and replays on reconnect', async () => {
    const user = userEvent.setup();
    const keys = trackTodoPosts();
    render(<ConnectivityLab requestDelayMs={0} />);
    await user.click(screen.getByRole('switch', { name: 'Simulate offline (this app only)' }));
    expect(banner()).toHaveTextContent('You are offline (simulated).');
    await addTodo(user, 'Buy milk');
    await addTodo(user, 'Call Ada');
    expect(
      within(screen.getByRole('list', { name: 'Outbox' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(stored().map((item) => item.title)).toEqual(['Buy milk', 'Call Ada']);
    expect(keys).toEqual([]);

    await user.click(screen.getByRole('switch', { name: 'Simulate offline (this app only)' }));
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Synced todos' })).toHaveTextContent('Call Ada'),
    );
    expect(screen.getByText('Empty.')).toBeInTheDocument();
    expect(stored()).toEqual([]);
    expect(keys).toHaveLength(2);
    expect(keys.every((key) => key.startsWith('local-'))).toBe(true);
    // Replayed oldest first: the newest synced item is listed first.
    const synced = within(screen.getByRole('list', { name: 'Synced todos' })).getAllByRole(
      'listitem',
    );
    expect(synced.map((item) => item.textContent?.split(' ')[0])).toEqual(['Call', 'Buy']);
    server.events.removeAllListeners();
  });

  it('reacts to the real offline/online events', async () => {
    const user = userEvent.setup();
    render(<ConnectivityLab requestDelayMs={0} />);
    restores.push(setOnline(false));
    expect(banner()).toHaveTextContent(/^You are offline\. New todos/);
    expect(screen.getByText('navigator.onLine (useOnlineStatus)').nextSibling).toHaveTextContent(
      'false',
    );
    await addTodo(user, 'Queued for real');
    restores.pop()?.();
    restores.push(setOnline(true));
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Synced todos' })).toHaveTextContent(
        'Queued for real',
      ),
    );
  });

  it('replays a queue persisted by an earlier visit on mount', async () => {
    const item = createQueuedTodo('From last session');
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify({ __v: 1, value: [item] }));
    render(<ConnectivityLab requestDelayMs={0} />);
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Synced todos' })).toHaveTextContent(
        'From last session',
      ),
    );
    expect(stored()).toEqual([]);
  });

  it('keeps a failing change for a few attempts, then moves it to "Needs attention"', async () => {
    const user = userEvent.setup();
    render(<ConnectivityLab requestDelayMs={0} />);
    await user.click(screen.getByRole('switch', { name: /Simulate offline/ }));
    await addTodo(user, 'please fail');
    await user.click(screen.getByRole('switch', { name: /Simulate offline/ }));
    const outbox = await screen.findByText(/attempt 1 failed/);
    expect(outbox).toHaveTextContent('HTTP 500: Server rejected "please fail"');
    for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const sync = screen.getByRole('button', { name: 'Sync now' });
      await waitFor(() => expect(sync).toBeEnabled());
      await user.click(sync);
    }
    const failed = await screen.findByRole('list', { name: 'Failed changes' });
    expect(failed).toHaveTextContent('please fail');
    expect(stored()).toEqual([]);

    // Requeue puts it back with a fresh attempt budget.
    await user.click(within(failed).getByRole('button', { name: 'Requeue please fail' }));
    expect(screen.getByRole('list', { name: 'Outbox' })).toHaveTextContent('please fail');
  });

  it('queues the change when the request itself fails (no connection)', async () => {
    const user = userEvent.setup();
    server.use(http.post('/api/todos', () => HttpResponse.error()));
    render(<ConnectivityLab requestDelayMs={0} />);
    await addTodo(user, 'Flaky wifi');
    expect(await screen.findByRole('list', { name: 'Outbox' })).toHaveTextContent('Flaky wifi');
  });

  it('reports server rejections of direct writes without queueing them', async () => {
    const user = userEvent.setup();
    render(<ConnectivityLab requestDelayMs={0} />);
    await addTodo(user, 'fail now');
    expect(await screen.findByText(/Server rejected “fail now”/)).toBeInTheDocument();
    expect(screen.getByText('Empty.')).toBeInTheDocument();
  });

  it('validates the title', async () => {
    const user = userEvent.setup();
    render(<ConnectivityLab requestDelayMs={0} />);
    await user.click(screen.getByRole('button', { name: 'Add todo' }));
    expect(screen.getByText('Enter a title.')).toBeInTheDocument();
  });

  it('shows Network Information details where supported', () => {
    const connection = Object.assign(new EventTarget(), {
      effectiveType: '2g',
      downlink: 0.25,
      rtt: 1400,
      saveData: true,
    });
    restores.push(overrideProperty(navigator, 'connection', connection));
    render(<ConnectivityLab />);
    expect(screen.getByText('Network Information API').nextSibling).toHaveTextContent(
      '2g · 0.25 Mb/s · 1400 ms RTT · data saver on',
    );
    expect(screen.getByText('Slow or metered connection')).toBeInTheDocument();
  });
});

describe('ConnectivityScenario', () => {
  it('explains the limits of navigator.onLine and reports missing Network Information', () => {
    render(<ConnectivityScenario />);
    expect(screen.getByText(/What “online” really means/)).toBeInTheDocument();
    expect(screen.getByText('Network Information API').nextSibling).toHaveTextContent(
      'not supported',
    );
  });
});
