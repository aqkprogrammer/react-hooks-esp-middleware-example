import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDocumentVisibility, setOnline } from '../../../test/browserMocks';
import { server } from '../../../test/server';
import PollingDashboardScenario from './PollingDashboardScenario';

let statsRequests = 0;
const restorers: Array<() => void> = [];

beforeEach(() => {
  statsRequests = 0;
  server.events.on('request:start', ({ request }) => {
    if (new URL(request.url).pathname === '/api/stats') statsRequests += 1;
  });
});
afterEach(() => {
  server.events.removeAllListeners();
  // Undo in reverse: each override captured the descriptor installed before it.
  restorers
    .splice(0)
    .reverse()
    .forEach((restore) => restore());
  vi.useRealTimers();
});

const card = (label: string) =>
  within(screen.getByRole('list', { name: 'Key metrics' }))
    .getByText(label)
    .closest('li') as HTMLElement;
const waitForTick = (tick: number) =>
  waitFor(() => expect(screen.getByText(new RegExp(`tick ${tick}$`))).toBeInTheDocument());
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('PollingDashboardScenario', () => {
  it('shows KPIs, the last-updated time and trends after a manual refresh', async () => {
    const user = userEvent.setup();
    render(<PollingDashboardScenario />);
    expect(screen.getByText('Waiting for the first update…')).toBeInTheDocument();
    await waitForTick(1);
    // Tick 1 from the deterministic mock: 120 + 37 users, 900 + 113 requests.
    expect(card('Active users')).toHaveTextContent('157');
    expect(card('Requests / min')).toHaveTextContent('1,013');
    expect(screen.getByText(/Last updated/).querySelector('time')).toHaveAttribute('datetime');

    await user.click(screen.getByRole('button', { name: 'Refresh now' }));
    await waitForTick(2);
    expect(card('Active users')).toHaveTextContent('134');
    expect(card('Active users')).toHaveTextContent('down 23 since last update');
    expect(card('Requests / min')).toHaveTextContent('up 113 since last update');
  });

  it('polls again after the selected interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PollingDashboardScenario />);
    fireEvent.change(screen.getByLabelText('Refresh every'), { target: { value: '2000' } });
    expect(screen.getByRole('status')).toHaveTextContent('Live — every 2 s');
    await waitForTick(1);
    const before = statsRequests;
    await act(() => vi.advanceTimersByTimeAsync(2_200));
    await waitFor(() => expect(statsRequests).toBe(before + 1));
  });

  it('pauses while the tab is hidden and polls immediately when visible again', async () => {
    render(<PollingDashboardScenario />);
    await waitForTick(1);
    restorers.push(setDocumentVisibility('hidden'));
    expect(screen.getByRole('status')).toHaveTextContent('Paused — tab hidden');
    const whileHidden = statsRequests;
    await wait(150);
    expect(statsRequests).toBe(whileHidden);

    restorers.push(setDocumentVisibility('visible'));
    expect(screen.getByRole('status')).toHaveTextContent('Live');
    await waitForTick(2);
  });

  it('pauses while offline and disables manual refresh', async () => {
    render(<PollingDashboardScenario />);
    await waitForTick(1);
    restorers.push(setOnline(false));
    expect(screen.getByRole('status')).toHaveTextContent('Paused — you are offline');
    expect(screen.getByRole('button', { name: 'Refresh now' })).toBeDisabled();
    expect(screen.getByText(/resumes automatically/)).toBeInTheDocument();

    restorers.push(setOnline(true));
    await waitForTick(2);
  });

  it('can be paused and resumed by the user', async () => {
    const user = userEvent.setup();
    render(<PollingDashboardScenario />);
    await waitForTick(1);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('status')).toHaveTextContent('Paused');
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await waitForTick(2);
  });

  it('keeps the last good data when a poll fails', async () => {
    const user = userEvent.setup();
    render(<PollingDashboardScenario />);
    await waitForTick(1);
    server.use(
      http.get('/api/stats', () => HttpResponse.json({ message: 'Overloaded' }, { status: 503 })),
    );
    await user.click(screen.getByRole('button', { name: 'Refresh now' }));
    expect(await screen.findByText('Last update failed')).toBeInTheDocument();
    expect(screen.getByText(/HTTP 503: Overloaded/)).toBeInTheDocument();
    expect(card('Active users')).toHaveTextContent('157');
  });
});
