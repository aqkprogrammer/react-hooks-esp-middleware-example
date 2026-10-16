import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import DataTableScenario from './DataTableScenario';
import { nextSort, productsUrl } from './productsQuery';

let requests: URL[] = [];
const productRequests = () => requests.filter((url) => url.pathname === '/api/products');

beforeEach(() => {
  requests = [];
  server.events.on('request:start', ({ request }) => {
    requests.push(new URL(request.url));
  });
});
afterEach(() => server.events.removeAllListeners());

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row');
const expectStatus = (text: string | RegExp) =>
  waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));
const priceOf = (row: HTMLElement) =>
  Number((within(row).getAllByRole('cell')[1]!.textContent ?? '').replace(/[^0-9.]/g, ''));

describe('DataTableScenario', () => {
  it('loads the first page from the API', async () => {
    render(<DataTableScenario />);
    await expectStatus('Showing 1–10 of 500 products');
    expect(bodyRows()).toHaveLength(10);
    expect(productRequests()[0]?.search).toBe('?page=1&pageSize=10');
  });

  it('sorts on the server via accessible column header buttons', async () => {
    const user = userEvent.setup();
    render(<DataTableScenario />);
    await expectStatus('Showing 1–10 of 500 products');
    const priceHeader = screen.getByRole('columnheader', { name: /Price/ });
    expect(priceHeader).not.toHaveAttribute('aria-sort');

    await user.click(within(priceHeader).getByRole('button', { name: /Price/ }));
    expect(priceHeader).toHaveAttribute('aria-sort', 'ascending');
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Products table' })).toHaveAttribute(
        'aria-busy',
        'false',
      ),
    );
    const ascending = bodyRows().map(priceOf);
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    expect(productRequests().at(-1)?.searchParams.get('order')).toBe('asc');

    await user.click(within(priceHeader).getByRole('button'));
    expect(priceHeader).toHaveAttribute('aria-sort', 'descending');
    await waitFor(() => expect(productRequests().at(-1)?.searchParams.get('order')).toBe('desc'));

    await user.click(within(priceHeader).getByRole('button'));
    expect(priceHeader).not.toHaveAttribute('aria-sort');
  });

  it('resets to page 1 when the category changes', async () => {
    const user = userEvent.setup();
    render(<DataTableScenario />);
    await expectStatus('Showing 1–10 of 500');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await expectStatus('Showing 11–20 of 500');
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');

    await user.selectOptions(screen.getByLabelText('Category'), 'Books');
    await expectStatus(/Showing 1–10 of \d+ products/);
    expect(screen.getByRole('status')).not.toHaveTextContent('of 500');
    for (const row of bodyRows()) expect(within(row).getByText('Books')).toBeInTheDocument();
    expect(productRequests().at(-1)?.searchParams.get('page')).toBe('1');
  });

  it('debounces the text filter into a single request', async () => {
    const user = userEvent.setup();
    render(<DataTableScenario />);
    await expectStatus('of 500');
    const before = productRequests().length;
    await user.type(screen.getByLabelText('Filter by name'), 'lamp');
    await waitFor(() => expect(productRequests().at(-1)?.searchParams.get('q')).toBe('lamp'));
    await expectStatus(/Showing 1–\d+ of (?!500)\d+ products/);
    expect(productRequests().length - before).toBe(1);
    for (const row of bodyRows()) expect(row).toHaveTextContent(/lamp/i);
  });

  it('keeps the previous page visible while the next one loads', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/products', async ({ request }) => {
        if (new URL(request.url).searchParams.get('page') === '2') await delay(300);
        return undefined;
      }),
    );
    render(<DataTableScenario />);
    await expectStatus('Showing 1–10');
    const firstRowName = within(bodyRows()[0]!).getByRole('rowheader').textContent;

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByRole('region', { name: 'Products table' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(bodyRows()).toHaveLength(10);
    expect(within(bodyRows()[0]!).getByRole('rowheader')).toHaveTextContent(firstRowName ?? '');

    await expectStatus('Showing 11–20');
    expect(within(bodyRows()[0]!).getByRole('rowheader')).not.toHaveTextContent(firstRowName ?? '');
  });

  it('changes the page size', async () => {
    const user = userEvent.setup();
    render(<DataTableScenario />);
    await expectStatus('Showing 1–10');
    await user.selectOptions(screen.getByLabelText('Rows per page'), '20');
    await expectStatus('Showing 1–20 of 500');
    expect(bodyRows()).toHaveLength(20);
  });

  it('shows an empty state with a way out', async () => {
    const user = userEvent.setup();
    render(<DataTableScenario />);
    await expectStatus('of 500');
    await user.type(screen.getByLabelText('Filter by name'), 'no such product');
    await expectStatus('No products match your filters.');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await expectStatus('Showing 1–10 of 500');
    expect(screen.getByLabelText('Filter by name')).toHaveValue('');
  });

  it('shows errors with a retry button', async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get('/api/products', () =>
        fail ? HttpResponse.json({ message: 'Database down' }, { status: 500 }) : undefined,
      ),
    );
    render(<DataTableScenario />);
    expect(await screen.findByText('HTTP 500: Database down')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await expectStatus('Showing 1–10 of 500');
  });
});

describe('productsQuery helpers', () => {
  it('cycles sort state', () => {
    expect(nextSort(null, 'price')).toEqual({ key: 'price', order: 'asc' });
    expect(nextSort({ key: 'price', order: 'asc' }, 'price')).toEqual({
      key: 'price',
      order: 'desc',
    });
    expect(nextSort({ key: 'price', order: 'desc' }, 'price')).toBeNull();
    expect(nextSort({ key: 'price', order: 'desc' }, 'name')).toEqual({
      key: 'name',
      order: 'asc',
    });
  });

  it('omits empty filters from the URL and encodes the rest', () => {
    expect(productsUrl({ page: 1, pageSize: 10, text: '', category: '', sort: null })).toBe(
      '/api/products?page=1&pageSize=10',
    );
    expect(
      productsUrl({
        page: 2,
        pageSize: 5,
        text: 'a&b',
        category: 'Toys',
        sort: { key: 'rating', order: 'desc' },
      }),
    ).toBe('/api/products?page=2&pageSize=5&q=a%26b&category=Toys&sort=rating&order=desc');
  });
});
