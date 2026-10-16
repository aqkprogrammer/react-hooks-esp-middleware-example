import { useId, useState } from 'react';
import { Badge, Button, Callout, Panel, ScrollArea, TextField } from '../../../components/ui';
import { useFetch, usePagination } from '../../../hooks';
import './UsePaginationDemo.css';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
}

interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Server-side pagination: `usePagination` owns page state, `useFetch` loads the page. */
export default function UsePaginationDemo() {
  const [query, setQuery] = useState('');
  const [total, setTotal] = useState(0);
  const pager = usePagination({ total, initialPageSize: 10 });
  const pageSizeId = useId();

  const url = `/api/products?q=${encodeURIComponent(query)}&page=${pager.page}&pageSize=${pager.pageSize}`;
  const result = useFetch<Page<Product>>(url, { keepPreviousData: true });
  const data = result.data;

  // Adjust state while rendering when the server reports a new total (no effect needed).
  if (result.status === 'success' && result.data.total !== total) setTotal(result.data.total);

  return (
    <div className="stack">
      <Panel title="Products">
        <div className="row">
          <TextField
            label="Filter by name"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              pager.first(); // reset in the same event, not in an effect
            }}
          />
          <div className="field">
            <label className="field-label" htmlFor={pageSizeId}>
              Page size
            </label>
            <select
              id={pageSizeId}
              className="input"
              value={pager.pageSize}
              onChange={(event) => pager.setPageSize(Number(event.target.value))}
            >
              {[5, 10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p aria-live="polite" className="small">
          {total === 0
            ? 'No results'
            : `Showing ${pager.startIndex + 1}–${pager.endIndex} of ${total}`}{' '}
          {result.status === 'pending' ? <Badge tone="info">loading</Badge> : null}
        </p>
        {result.status === 'error' ? (
          <Callout tone="danger" title="Could not load products">
            {result.error.message}
          </Callout>
        ) : null}
        <ScrollArea label="Products">
          <ul className="list" aria-label="Products" aria-busy={result.status === 'pending'}>
            {(data?.items ?? []).map((product) => (
              <li key={product.id} className="spread">
                <span>{product.name}</span>
                <span className="muted small">
                  {product.category} · ${product.price.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <nav aria-label="Pagination" className="row">
          <Button size="sm" onClick={pager.previous} disabled={!pager.hasPrevious}>
            Previous
          </Button>
          {pager.pageItems.map((item) =>
            typeof item === 'number' ? (
              <Button
                key={item}
                size="sm"
                variant={item === pager.page ? 'primary' : 'ghost'}
                aria-current={item === pager.page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                onClick={() => pager.setPage(item)}
              >
                {item}
              </Button>
            ) : (
              <span key={item} className="use-pagination-demo-ellipsis" aria-hidden="true">
                …
              </span>
            ),
          )}
          <Button size="sm" onClick={pager.next} disabled={!pager.hasNext}>
            Next
          </Button>
        </nav>
      </Panel>
    </div>
  );
}
