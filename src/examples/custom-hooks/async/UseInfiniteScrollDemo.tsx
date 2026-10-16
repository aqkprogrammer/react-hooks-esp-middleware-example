import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { fetchJson, useInfiniteScroll } from '../../../hooks';
import './UseInfiniteScrollDemo.css';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface Page {
  items: Product[];
  page: number;
  totalPages: number;
  total: number;
}

const PAGE_SIZE = 20;

export default function UseInfiniteScrollDemo() {
  const [items, setItems] = useState<Product[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadCount, setLoadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Abort a page request that is still running when the demo unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const loadMore = useCallback(async () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setLoading(true);
    try {
      const page = await fetchJson<Page>(
        `/api/products?page=${nextPage}&pageSize=${PAGE_SIZE}&delay=600`,
        { signal: controller.signal },
      );
      setItems((previous) => [...previous, ...page.items]);
      setNextPage(page.page + 1);
      setHasMore(page.page < page.totalPages);
      setTotal(page.total);
      setLoadCount((count) => count + 1);
    } catch (caught) {
      if (!controller.signal.aborted) setError((caught as Error).message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [nextPage]);

  const { sentinelRef, isLoading, isSupported } = useInfiniteScroll({
    loadMore,
    hasMore: hasMore && error === null,
    // Also covers loads started by the button, so the two can never overlap.
    isLoading: loading,
    root,
    rootMargin: '100px',
  });

  return (
    <div className="stack">
      <Panel
        title="Products"
        description="Scroll inside the list. Each page is requested exactly once, even while you keep scrolling."
      >
        <div className="row small" aria-live="polite">
          <span>
            Loaded {items.length}
            {total === null ? '' : ` of ${total}`} products in {loadCount} requests
          </span>
          {isLoading ? <Badge tone="info">loading page {nextPage}</Badge> : null}
          {!isSupported ? <Badge tone="warn">IntersectionObserver unsupported</Badge> : null}
        </div>
        <div
          ref={setRoot}
          className="use-infinite-scroll-demo-viewport"
          role="region"
          aria-label="Product list"
          tabIndex={0}
        >
          <ul className="use-infinite-scroll-demo-list">
            {items.map((product) => (
              <li key={product.id} className="spread">
                <span>{product.name}</span>
                <span className="muted small">${product.price.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div ref={sentinelRef} className="use-infinite-scroll-demo-sentinel" aria-hidden="true">
            {hasMore ? (isLoading ? 'Loading…' : '') : 'End of list'}
          </div>
        </div>
        {error ? (
          <Callout tone="danger" title="Loading failed">
            {error}
          </Callout>
        ) : null}
        <Button onClick={() => void loadMore()} disabled={isLoading || !hasMore}>
          {hasMore ? 'Load more' : 'Everything loaded'}
        </Button>
      </Panel>
      <Callout title="Accessibility">
        Infinite scroll alone traps keyboard users and hides the footer. Keep a visible “Load more”
        button (it also covers browsers without IntersectionObserver) and announce progress in a
        polite live region.
      </Callout>
    </div>
  );
}
