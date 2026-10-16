import { render, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { leaveActEnvironment } from '../built-in/modern/testUtils';
import ObjectDepsDemo from './ObjectDepsDemo';

describe('ObjectDepsDemo', () => {
  it('only requests when a primitive dependency changes', async () => {
    const seen: string[] = [];
    server.use(
      http.get('/api/products', ({ request }) => {
        const url = new URL(request.url);
        seen.push(`${url.searchParams.get('category')}/${url.searchParams.get('pageSize')}`);
        return HttpResponse.json({ items: [{ id: 1, name: 'Item' }], total: 7 });
      }),
    );
    render(<ObjectDepsDemo />);
    leaveActEnvironment();
    await waitFor(() =>
      expect(screen.getByText('Completed requests').nextSibling).toHaveTextContent('1'),
    );

    const rerender = screen.getByRole('button', { name: /Unrelated re-render/ });
    rerender.click();
    rerender.click();
    await screen.findByRole('button', { name: 'Unrelated re-render (2)' });
    await delay(30);
    expect(seen).toEqual(['Books/5']);

    screen.getByRole('button', { name: 'Page size: 5' }).click();
    await waitFor(() => expect(seen).toEqual(['Books/5', 'Books/10']));
    await waitFor(() =>
      expect(screen.getByText('Completed requests').nextSibling).toHaveTextContent('2'),
    );
  });
});
