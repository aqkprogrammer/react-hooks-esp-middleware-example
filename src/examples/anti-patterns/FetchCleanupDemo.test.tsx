import { render, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { createGate, leaveActEnvironment, typeNatively } from '../built-in/modern/testUtils';
import FetchCleanupDemo from './FetchCleanupDemo';

const panel = (name: string) => within(screen.getByRole('region', { name }));

describe('FetchCleanupDemo', () => {
  it('shows a stale response without cleanup and the latest one with AbortController', async () => {
    const requests: string[] = [];
    const slowFirstQuery = createGate();
    server.use(
      http.get('/api/search', async ({ request }) => {
        const query = new URL(request.url).searchParams.get('q') ?? '';
        requests.push(query);
        // Deterministic out-of-order responses: "j" is held until "ja" has answered.
        if (query === 'j') await slowFirstQuery.promise;
        return HttpResponse.json({ query, results: [`${query} result`] });
      }),
    );
    render(<FetchCleanupDemo />);
    leaveActEnvironment();
    const input = screen.getByLabelText<HTMLInputElement>('Search languages');
    typeNatively(input, 'j');
    await waitFor(() => expect(requests).toEqual(['j', 'j']));
    typeNatively(input, 'ja');

    const naive = panel('Without cleanup (bug reproduction)');
    const fixed = panel('With AbortController cleanup');
    expect(await fixed.findByText('ja result')).toBeInTheDocument();
    expect(await naive.findByText('ja result')).toBeInTheDocument();

    // Now the slow, outdated response arrives.
    slowFirstQuery.open();
    expect(await naive.findByText('stale: you typed “ja”', { exact: false })).toBeInTheDocument();
    expect(naive.getByText('j result')).toBeInTheDocument();
    // The fixed panel aborted that request, so it still shows the latest results.
    await delay(20);
    expect(fixed.getByText('current')).toBeInTheDocument();
    expect(fixed.getByText('ja result')).toBeInTheDocument();
  });
});
