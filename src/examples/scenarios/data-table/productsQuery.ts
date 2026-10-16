/** Client-side contract for `GET /api/products` (see src/mocks/handlers.ts). */
export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  stock: number;
}

export interface ProductPage {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type SortKey = 'name' | 'price' | 'rating';
export type SortOrder = 'asc' | 'desc';
export type Sort = { key: SortKey; order: SortOrder } | null;

/** The categories the API documents. A real app would fetch them. */
export const CATEGORIES = [
  'Books',
  'Electronics',
  'Garden',
  'Kitchen',
  'Outdoors',
  'Toys',
] as const;

export const PAGE_SIZES = [5, 10, 20, 50] as const;

export interface ProductQuery {
  page: number;
  pageSize: number;
  text: string;
  category: string;
  sort: Sort;
}

/** Builds the request URL. Empty filters are left out so URLs stay canonical. */
export function productsUrl(query: ProductQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.text) params.set('q', query.text);
  if (query.category) params.set('category', query.category);
  if (query.sort) {
    params.set('sort', query.sort.key);
    params.set('order', query.sort.order);
  }
  return `/api/products?${params.toString()}`;
}

/** Header click cycle: unsorted → ascending → descending → unsorted. */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (!current || current.key !== key) return { key, order: 'asc' };
  if (current.order === 'asc') return { key, order: 'desc' };
  return null;
}

export const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
