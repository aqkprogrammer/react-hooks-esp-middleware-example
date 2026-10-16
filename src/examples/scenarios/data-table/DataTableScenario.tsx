import { useId, useState } from 'react';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { useDebouncedCallback, useFetch, usePagination } from '../../../hooks';
import {
  CATEGORIES,
  PAGE_SIZES,
  nextSort,
  priceFormat,
  productsUrl,
  type ProductPage,
  type Sort,
  type SortKey,
} from './productsQuery';
import './DataTableScenario.css';

const COLUMNS: ReadonlyArray<{ key: SortKey | 'category' | 'stock'; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price' },
  { key: 'rating', label: 'Rating' },
  { key: 'stock', label: 'Stock' },
];

const isSortKey = (key: string): key is SortKey =>
  key === 'name' || key === 'price' || key === 'rating';

/**
 * A server-driven product table: sorting, filtering and paging all happen on
 * the API. State is plain local state (no URL), `usePagination` owns the
 * page maths and `useFetch` with `keepPreviousData` keeps the current page on
 * screen while the next one loads.
 */
export default function DataTableScenario() {
  const categoryId = useId();
  const pageSizeId = useId();
  const [filterInput, setFilterInput] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<Sort>(null);
  // The total of the last response. Needed *before* useFetch runs, because
  // usePagination clamps the page with it.
  const [total, setTotal] = useState(0);

  const pager = usePagination({ total, initialPageSize: 10, siblingCount: 1 });
  const { first } = pager;

  // Filter changes and the page reset happen in the same callback, so they
  // produce one request, not one for the old filter and one for the new.
  const applyText = useDebouncedCallback((value: string) => {
    setText(value.trim());
    first();
  }, 300);

  const products = useFetch<ProductPage>(
    productsUrl({ page: pager.page, pageSize: pager.pageSize, text, category, sort }),
    { keepPreviousData: true },
  );
  const data = products.data;

  // "Adjusting state when a prop changes": store the new total during render.
  if (data && data.total !== total) setTotal(data.total);

  const isLoading = products.status === 'pending';
  const sortLabel = sort
    ? `sorted by ${sort.key} ${sort.order === 'asc' ? 'ascending' : 'descending'}`
    : 'unsorted';
  const filtersActive = Boolean(text || category);

  const clearFilters = () => {
    applyText.cancel();
    setFilterInput('');
    setText('');
    setCategory('');
    first();
  };

  return (
    <div className="stack">
      <Panel
        title="Products"
        description="Sorting, filtering and paging are done by the API. The current page stays visible while the next one loads."
      >
        <div className="data-table-toolbar">
          <TextField
            label="Filter by name"
            type="search"
            value={filterInput}
            onChange={(event) => {
              setFilterInput(event.target.value);
              applyText(event.target.value);
            }}
            hint="Applied 300 ms after you stop typing."
          />
          <div className="field">
            <label className="field-label" htmlFor={categoryId}>
              Category
            </label>
            <select
              id={categoryId}
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                first();
              }}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor={pageSizeId}>
              Rows per page
            </label>
            <select
              id={pageSizeId}
              value={pager.pageSize}
              onChange={(event) => pager.setPageSize(Number(event.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="spread small">
          <p role="status" className="data-table-status">
            {data
              ? data.total === 0
                ? 'No products match your filters.'
                : `Showing ${(data.page - 1) * data.pageSize + 1}–${
                    (data.page - 1) * data.pageSize + data.items.length
                  } of ${data.total} products`
              : ''}
          </p>
          {isLoading ? <Badge tone="info">Loading…</Badge> : null}
        </div>

        {products.status === 'error' ? (
          <Callout tone="danger" title="Could not load products">
            <div className="row">
              <span>{products.error.message}</span>
              <Button size="sm" onClick={products.reload}>
                Retry
              </Button>
            </div>
          </Callout>
        ) : null}

        <div
          className="data-table-scroll"
          role="region"
          aria-label="Products table"
          tabIndex={0}
          aria-busy={isLoading}
        >
          <table className={['data-table', isLoading ? 'data-table-loading' : ''].join(' ')}>
            <caption className="visually-hidden">
              Products, {sortLabel}, page {pager.page} of {pager.totalPages}
            </caption>
            <thead>
              <tr>
                {COLUMNS.map((column) => {
                  if (!isSortKey(column.key)) {
                    return (
                      <th key={column.key} scope="col">
                        {column.label}
                      </th>
                    );
                  }
                  const key = column.key;
                  const active = sort?.key === key ? sort.order : null;
                  return (
                    <th
                      key={key}
                      scope="col"
                      aria-sort={
                        active === 'asc'
                          ? 'ascending'
                          : active === 'desc'
                            ? 'descending'
                            : undefined
                      }
                    >
                      <button
                        type="button"
                        className="data-table-sort"
                        onClick={() => {
                          setSort((previous) => nextSort(previous, key));
                          first();
                        }}
                      >
                        {column.label}
                        <span aria-hidden="true" className="data-table-sort-icon">
                          {active === 'asc' ? '▲' : active === 'desc' ? '▼' : '↕'}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data
                ? data.items.map((product) => (
                    <tr key={product.id}>
                      <th scope="row">{product.name}</th>
                      <td>{product.category}</td>
                      <td className="data-table-number">{priceFormat.format(product.price)}</td>
                      <td className="data-table-number">{product.rating.toFixed(1)}</td>
                      <td className="data-table-number">{product.stock}</td>
                    </tr>
                  ))
                : // First load: reserve the rows so the layout does not jump.
                  Array.from({ length: pager.pageSize }, (_, index) => (
                    <tr key={index} aria-hidden="true" className="data-table-placeholder">
                      <td colSpan={COLUMNS.length}>&nbsp;</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {data && data.total === 0 && filtersActive ? (
          <div>
            <Button onClick={clearFilters}>Clear filters</Button>
          </div>
        ) : null}

        <nav aria-label="Pagination" className="row">
          <Button size="sm" onClick={pager.previous} disabled={!pager.hasPrevious}>
            Previous page
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
              <span key={item} aria-hidden="true" className="muted">
                …
              </span>
            ),
          )}
          <Button size="sm" onClick={pager.next} disabled={!pager.hasNext}>
            Next page
          </Button>
        </nav>
      </Panel>
    </div>
  );
}
