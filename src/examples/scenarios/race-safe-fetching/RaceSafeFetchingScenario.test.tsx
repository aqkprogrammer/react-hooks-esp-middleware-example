import { render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import RaceSafeFetchingScenario from './RaceSafeFetchingScenario';
import { useUserProfile } from './useUserProfile';

const NAMES: Record<string, string> = {
  '1': 'Ada Lovelace',
  '3': 'Alan Turing',
  '4': 'Katherine Johnson',
  '5': 'Edsger Dijkstra',
};

/** Same ordering as the real ?delay values, scaled down so tests stay fast. */
function useFastLatencies() {
  const latency: Record<string, number> = { '1': 300, '3': 30, '4': 10, '5': 200 };
  server.use(
    http.get('/api/users/:id', async ({ params }) => {
      const id = String(params.id);
      await delay(latency[id] ?? 20);
      const name = NAMES[id];
      return name
        ? HttpResponse.json({ id: Number(id), name, email: `${id}@example.com`, role: 'viewer' })
        : HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }),
  );
}

const naive = () => screen.getByRole('region', { name: 'Naive fetch in useEffect' });
const safe = () => screen.getByRole('region', { name: 'useUserProfile (useFetch)' });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('RaceSafeFetchingScenario', () => {
  it('reproduces the race: the naive column ends on the stale profile, the safe one does not', async () => {
    useFastLatencies();
    const user = userEvent.setup();
    render(<RaceSafeFetchingScenario />);
    expect(await within(safe()).findByText('Alan Turing')).toBeInTheDocument();
    expect(await within(naive()).findByText('Alan Turing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Ada/ }));
    await user.click(screen.getByRole('button', { name: /^Katherine/ }));
    expect(await within(safe()).findByText('Katherine Johnson')).toBeInTheDocument();

    await wait(400); // Ada's slow response has now arrived.
    expect(within(naive()).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(naive()).getByText('Out of sync: shows #1, selected #4')).toBeInTheDocument();
    expect(within(safe()).getByText('Katherine Johnson')).toBeInTheDocument();
    expect(within(safe()).getByText('In sync')).toBeInTheDocument();
  });

  it('replays the race with one button', async () => {
    useFastLatencies();
    const user = userEvent.setup();
    render(<RaceSafeFetchingScenario />);
    await user.click(screen.getByRole('button', { name: /Replay the race/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Katherine/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    await wait(400);
    expect(within(safe()).getByText('Katherine Johnson')).toBeInTheDocument();
    expect(within(naive()).getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('treats a 404 as an error in the safe column but as a "user" in the naive one', async () => {
    useFastLatencies();
    const user = userEvent.setup();
    render(<RaceSafeFetchingScenario />);
    // Let the initial request settle first, or the naive column races itself.
    expect(await within(naive()).findByText('Alan Turing')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Missing user/ }));
    expect(await within(safe()).findByText('HTTP 404: User not found')).toBeInTheDocument();
    expect(within(safe()).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(
      await within(naive()).findByText('Out of sync: shows #undefined, selected #404'),
    ).toBeInTheDocument();
    expect(within(naive()).getByText('Name').nextElementSibling).toHaveTextContent('undefined');
  });
});

describe('useUserProfile', () => {
  it('aborts the request in flight on unmount', async () => {
    let signal: AbortSignal | undefined;
    server.use(
      http.get('/api/users/:id', async ({ request }) => {
        signal = request.signal;
        await delay(200);
        return HttpResponse.json({ id: 2, name: 'Grace', email: 'g@example.com', role: 'editor' });
      }),
    );
    const { result, unmount } = renderHook(() => useUserProfile(2));
    await waitFor(() => expect(signal).toBeDefined());
    expect(result.current.status).toBe('pending');
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('rejects bodies that are not users', async () => {
    server.use(http.get('/api/users/:id', () => HttpResponse.json({ id: 'x' })));
    const { result } = renderHook(() => useUserProfile(1));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('The server sent something that is not a user');
  });

  it('is idle for a null id', () => {
    const { result } = renderHook(() => useUserProfile(null));
    expect(result.current.status).toBe('idle');
  });
});
