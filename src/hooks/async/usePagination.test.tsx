import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getPageItems, usePagination } from './usePagination';

describe('getPageItems', () => {
  it('lists every page when they fit', () => {
    expect(getPageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('adds ellipses around the current page', () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, 3, 4, 5, 'end-ellipsis', 20]);
    expect(getPageItems(10, 20)).toEqual([1, 'start-ellipsis', 9, 10, 11, 'end-ellipsis', 20]);
    expect(getPageItems(20, 20)).toEqual([1, 'start-ellipsis', 16, 17, 18, 19, 20]);
  });
});

describe('usePagination', () => {
  it('derives ranges and navigation flags', () => {
    const { result } = renderHook(() => usePagination({ total: 95, initialPageSize: 10 }));
    expect(result.current).toMatchObject({
      page: 1,
      totalPages: 10,
      startIndex: 0,
      endIndex: 10,
      hasPrevious: false,
      hasNext: true,
    });
    act(() => result.current.last());
    expect(result.current).toMatchObject({
      page: 10,
      startIndex: 90,
      endIndex: 95,
      hasNext: false,
    });
    act(() => result.current.previous());
    expect(result.current.page).toBe(9);
    act(() => result.current.first());
    expect(result.current.page).toBe(1);
  });

  it('clamps out-of-range pages', () => {
    const { result } = renderHook(() => usePagination({ total: 30 }));
    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(3);
    act(() => result.current.setPage(-4));
    expect(result.current.page).toBe(1);
    act(() => result.current.previous());
    expect(result.current.page).toBe(1);
  });

  it('clamps during render when the total shrinks', () => {
    const { result, rerender } = renderHook(({ total }) => usePagination({ total }), {
      initialProps: { total: 100 },
    });
    act(() => result.current.setPage(8));
    rerender({ total: 25 });
    expect(result.current.page).toBe(3);
    expect(result.current.totalPages).toBe(3);
  });

  it('keeps the first visible item when the page size changes', () => {
    const { result } = renderHook(() => usePagination({ total: 100, initialPageSize: 10 }));
    act(() => result.current.setPage(5)); // items 40..49
    act(() => result.current.setPageSize(25));
    expect(result.current).toMatchObject({ page: 2, pageSize: 25, startIndex: 25 });
  });

  it('has one page and an empty range for an empty list', () => {
    const { result } = renderHook(() => usePagination({ total: 0 }));
    expect(result.current).toMatchObject({
      page: 1,
      totalPages: 1,
      startIndex: 0,
      endIndex: 0,
      hasNext: false,
    });
  });
});
