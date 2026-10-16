import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import SearchWithCancellationScenario from './SearchWithCancellationScenario';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const expectStatus = (text: string) =>
  waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text), { timeout: 2000 });

describe('SearchWithCancellationScenario', () => {
  it('debounces typing into a single request and announces the result count', async () => {
    const requested: string[] = [];
    server.use(
      http.get('/api/search', ({ request }) => {
        const q = new URL(request.url).searchParams.get('q') ?? '';
        requested.push(q);
        return HttpResponse.json({ query: q, results: q === 'rust' ? ['Rust'] : [] });
      }),
    );
    const user = userEvent.setup();
    render(<SearchWithCancellationScenario />);
    await user.type(screen.getByLabelText('Search languages'), 'rust');

    await expectStatus('1 result for “rust”');
    const list = screen.getByRole('list', { name: 'Results for rust' });
    expect(within(list).getByText('Rust')).toBeInTheDocument();
    expect(requested).toEqual(['rust']);
  });

  it('enforces the minimum query length', async () => {
    const user = userEvent.setup();
    render(<SearchWithCancellationScenario />);
    await user.type(screen.getByLabelText('Search languages'), 'j');
    expect(screen.getByText(/searches start at 2 characters/)).toBeInTheDocument();
    await wait(400);
    expect(screen.queryByText(/→ GET/)).not.toBeInTheDocument();
  });

  it('aborts the slow stale request so it can never overwrite the newer results', async () => {
    server.use(
      http.get('/api/search', async ({ request }) => {
        const q = new URL(request.url).searchParams.get('q') ?? '';
        // Inverted latency, exaggerated: the earlier query answers last.
        await delay(q === 'ja' ? 600 : 20);
        return HttpResponse.json({
          query: q,
          results: q === 'ja' ? ['Java', 'JavaScript', 'Julia'] : ['Java', 'JavaScript'],
        });
      }),
    );
    const user = userEvent.setup();
    render(<SearchWithCancellationScenario />);
    await user.selectOptions(screen.getByLabelText('Debounce'), '0');
    const input = screen.getByLabelText('Search languages');

    await user.type(input, 'ja');
    expect(await screen.findByText('→ GET /api/search?q=ja')).toBeInTheDocument();
    await user.type(input, 'v');

    await expectStatus('2 results for “jav”');
    expect(screen.getByText(/aborted "ja"/)).toBeInTheDocument();
    // Long after the stale response would have arrived, the newer results stay.
    await wait(700);
    expect(screen.getByRole('status')).toHaveTextContent('2 results for “jav”');
    expect(screen.queryByText('Julia')).not.toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    const user = userEvent.setup();
    render(<SearchWithCancellationScenario />);
    await user.type(screen.getByLabelText('Search languages'), 'zzz');
    await expectStatus('No languages match “zzz”');
  });

  it('shows a 503 as an error with a working retry', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.get('/api/search', () => {
        calls += 1;
        return HttpResponse.json({ message: 'Search service unavailable' }, { status: 503 });
      }),
    );
    render(<SearchWithCancellationScenario />);
    await user.type(screen.getByLabelText('Search languages'), 'error');

    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable (HTTP 503)');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(calls).toBe(2));
  });

  it('rejects responses with an unexpected shape', async () => {
    server.use(http.get('/api/search', () => HttpResponse.json({ results: 'nope' })));
    const user = userEvent.setup();
    render(<SearchWithCancellationScenario />);
    await user.type(screen.getByLabelText('Search languages'), 'go');
    expect(await screen.findByRole('alert')).toHaveTextContent('Unexpected search response shape');
  });
});
