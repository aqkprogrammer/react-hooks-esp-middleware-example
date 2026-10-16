import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installIntersectionObserver } from '../../../test/browserMocks';
import { server } from '../../../test/server';
import { feedReducer, initialFeedState, type FeedPage } from './feedState';
import InfiniteScrollScenario from './InfiniteScrollScenario';

let pagesRequested: string[] = [];
beforeEach(() => {
  pagesRequested = [];
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === '/api/products') pagesRequested.push(url.searchParams.get('page') ?? '');
  });
});
afterEach(() => server.events.removeAllListeners());

const items = () =>
  within(screen.getByRole('list', { name: 'Products' })).queryAllByRole('listitem');
const sentinel = (container: HTMLElement) =>
  container.querySelector('.infinite-scroll-sentinel') as Element;
// The mocked /api/products waits 200 ms per page, so allow more than
// waitFor's 1 s default when the machine is busy.
const expectStatus = (text: string) =>
  waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text), { timeout: 3000 });

/** Two tiny pages so the end of the list is reachable. */
function useTwoPageApi() {
  server.use(
    http.get('/api/products', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      const base = (page - 1) * 3;
      return HttpResponse.json({
        items: [1, 2, 3].map((n) => ({
          id: base + n,
          name: `Item ${base + n}`,
          category: 'Toys',
          price: 10,
        })),
        page,
        totalPages: 2,
        total: 6,
      } satisfies FeedPage);
    }),
  );
}

describe('InfiniteScrollScenario', () => {
  it('loads the next page when the sentinel scrolls into view, exactly once', async () => {
    const IO = installIntersectionObserver();
    const { container } = render(<InfiniteScrollScenario />);
    await expectStatus('Showing 20 of 500');
    expect(items()).toHaveLength(20);

    IO.triggerAll(sentinel(container), true);
    IO.triggerAll(sentinel(container), true);
    await expectStatus('Showing 40 of 500');
    expect(items()).toHaveLength(40);
    expect(pagesRequested).toEqual(['1', '2']);
  });

  it('falls back to the Load more button without IntersectionObserver', async () => {
    const user = userEvent.setup();
    render(<InfiniteScrollScenario />);
    expect(await screen.findByText('Automatic loading unavailable')).toBeInTheDocument();
    await expectStatus('Showing 20 of 500');
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await expectStatus('Loaded 20 more products. Showing 40 of 500.');
  });

  it('shows the end of the list', async () => {
    useTwoPageApi();
    const user = userEvent.setup();
    render(<InfiniteScrollScenario />);
    await expectStatus('Showing 3 of 6');
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await expectStatus('All 6 products loaded.');
    expect(screen.getByText('You’ve reached the end of the list.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('stops on errors, does not auto-retry, and recovers with Retry', async () => {
    const IO = installIntersectionObserver();
    const user = userEvent.setup();
    const { container } = render(<InfiniteScrollScenario />);
    await expectStatus('Showing 20 of 500');

    await user.click(screen.getByLabelText('Make the next page request fail'));
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'HTTP 500: Product service is unavailable',
    );
    expect(screen.getByLabelText('Make the next page request fail')).not.toBeChecked();

    IO.triggerAll(sentinel(container), true);
    expect(pagesRequested).toEqual(['1', '2']);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await expectStatus('Showing 40 of 500');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('resets the feed when the category changes', async () => {
    const user = userEvent.setup();
    render(<InfiniteScrollScenario />);
    await expectStatus('Showing 20 of 500');
    await user.selectOptions(screen.getByLabelText('Category'), 'Garden');
    expect(screen.getByRole('heading', { name: 'Garden products' })).toBeInTheDocument();
    await waitFor(() => expect(items().length).toBeGreaterThan(0));
    for (const item of items()) expect(item).toHaveTextContent('Garden');
  });
});

describe('feedReducer', () => {
  const page = (n: number, ids: number[]): FeedPage => ({
    items: ids.map((id) => ({ id, name: `#${id}`, category: 'Toys', price: 1 })),
    page: n,
    totalPages: 3,
    total: 9,
  });

  it('ignores duplicate pages and duplicate items', () => {
    const one = feedReducer(initialFeedState, { type: 'success', page: page(1, [1, 2, 3]) });
    const again = feedReducer(one, { type: 'success', page: page(1, [1, 2, 3]) });
    expect(again.items).toHaveLength(3);
    const overlapping = feedReducer(one, { type: 'success', page: page(2, [3, 4, 5]) });
    expect(overlapping.items.map((item) => item.id)).toEqual([1, 2, 3, 4, 5]);
    expect(overlapping.lastAdded).toBe(2);
  });
});
