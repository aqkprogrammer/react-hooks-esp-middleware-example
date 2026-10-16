import { useCallback, useMemo, useState } from 'react';

export type PageItem = number | 'start-ellipsis' | 'end-ellipsis';

export interface UsePaginationOptions {
  /** Total number of items across all pages (e.g. from the API's `total`). Use `0` while unknown. */
  total: number;
  /** Default `1`. */
  initialPage?: number;
  /** Default `10`. */
  initialPageSize?: number;
  /** Page numbers shown on each side of the current page in `pageItems`. Default `1`. */
  siblingCount?: number;
}

export interface UsePaginationResult {
  /** Current page, 1-based, always within `1..totalPages`. */
  page: number;
  pageSize: number;
  /** At least `1`, even when `total` is `0`. */
  totalPages: number;
  /** Index of the first item on the page (0-based) — the API `offset`. */
  startIndex: number;
  /** Index after the last item on the page (exclusive) — for `items.slice(startIndex, endIndex)`. */
  endIndex: number;
  hasPrevious: boolean;
  hasNext: boolean;
  /** Page buttons to render, e.g. `[1, 'start-ellipsis', 4, 5, 6, 'end-ellipsis', 20]`. */
  pageItems: PageItem[];
  setPage: (page: number) => void;
  next: () => void;
  previous: () => void;
  first: () => void;
  last: () => void;
  /** Changes the page size and keeps the current first item visible. */
  setPageSize: (pageSize: number) => void;
}

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/**
 * The page buttons to show: always the first and last page, `siblingCount`
 * pages around the current one, and ellipses for the gaps. Pure.
 */
export function getPageItems(page: number, totalPages: number, siblingCount = 1): PageItem[] {
  // first + last + current + 2 siblings + 2 ellipses
  const slots = siblingCount * 2 + 5;
  if (totalPages <= slots) return range(1, totalPages);
  const left = Math.max(page - siblingCount, 2);
  const right = Math.min(page + siblingCount, totalPages - 1);
  const showStart = left > 3;
  const showEnd = right < totalPages - 2;
  if (!showStart) return [...range(1, 3 + siblingCount * 2), 'end-ellipsis', totalPages];
  if (!showEnd) {
    return [1, 'start-ellipsis', ...range(totalPages - (2 + siblingCount * 2), totalPages)];
  }
  return [1, 'start-ellipsis', ...range(left, right), 'end-ellipsis', totalPages];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Page / page-size state plus everything derived from it. Pure state — it
 * fetches nothing, so it works with any data source: slice a local array
 * with `startIndex`/`endIndex`, or send `page`/`pageSize` to an API.
 *
 * ```tsx
 * const pager = usePagination({ total: data?.total ?? 0, initialPageSize: 20 });
 * const products = useFetch<Page>(`/api/products?page=${pager.page}&pageSize=${pager.pageSize}`);
 * ```
 *
 * `page` is clamped during render, so when `total` shrinks (a filter
 * removes results) you never request a page that no longer exists — no
 * effect needed. Reset to page 1 on filter changes by calling `first()` in
 * the same handler that changes the filter.
 */
export function usePagination(options: UsePaginationOptions): UsePaginationResult {
  const { total, initialPage = 1, initialPageSize = 10, siblingCount = 1 } = options;
  const [rawPage, setRawPage] = useState(initialPage);
  const [pageSize, setRawPageSize] = useState(() => Math.max(1, Math.floor(initialPageSize)));

  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
  const page = clamp(Math.floor(rawPage), 1, totalPages);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, Math.max(0, total));

  const setPage = useCallback(
    (next: number) => setRawPage(clamp(Math.floor(next), 1, totalPages)),
    [totalPages],
  );
  const next = useCallback(() => setPage(page + 1), [setPage, page]);
  const previous = useCallback(() => setPage(page - 1), [setPage, page]);
  const first = useCallback(() => setRawPage(1), []);
  const last = useCallback(() => setRawPage(totalPages), [totalPages]);
  const setPageSize = useCallback(
    (size: number) => {
      const safeSize = Math.max(1, Math.floor(size));
      setRawPageSize(safeSize);
      setRawPage(Math.floor(startIndex / safeSize) + 1);
    },
    [startIndex],
  );

  const pageItems = useMemo(
    () => getPageItems(page, totalPages, siblingCount),
    [page, totalPages, siblingCount],
  );

  return {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
    pageItems,
    setPage,
    next,
    previous,
    first,
    last,
    setPageSize,
  };
}
