import { useCallback, useEffect, useId, useReducer, useRef, useState } from 'react';
import { Badge, Button, Callout, Panel } from '../../../components/ui';
import { useInfiniteScroll } from '../../../hooks';
import { errorMessage, feedReducer, fetchFeedPage, initialFeedState } from './feedState';
import './InfiniteScrollScenario.css';

const CATEGORIES = ['Books', 'Electronics', 'Garden', 'Kitchen', 'Outdoors', 'Toys'] as const;
const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * An infinite product feed: an IntersectionObserver sentinel loads the next
 * page automatically, and a real "Load more" button does the same for
 * keyboard users, screen-reader users and browsers without the observer.
 */
export default function InfiniteScrollScenario() {
  const categoryId = useId();
  const [category, setCategory] = useState('');
  return (
    <div className="stack">
      <div className="field infinite-scroll-category">
        <label className="field-label" htmlFor={categoryId}>
          Category
        </label>
        <select
          id={categoryId}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All categories (500 products)</option>
          {CATEGORIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {/* A new key resets the feed and, by unmounting, aborts its request in flight. */}
      <ProductFeed key={category} category={category} />
      <Callout title="Why the button stays">
        Infinite scroll alone traps keyboard users above the footer, gives screen readers no sense
        of progress and does nothing without IntersectionObserver. The button and the polite status
        message cover all three.
      </Callout>
    </div>
  );
}

function ProductFeed({ category }: { category: string }) {
  const [state, dispatch] = useReducer(feedReducer, initialFeedState);
  const [failNext, setFailNext] = useState(false);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // First page: started by the effect, settled asynchronously.
  useEffect(() => {
    const controller = new AbortController();
    fetchFeedPage(1, category, { signal: controller.signal }).then(
      (page) => dispatch({ type: 'success', page }),
      (error: unknown) => {
        if (!controller.signal.aborted) dispatch({ type: 'failure', message: errorMessage(error) });
      },
    );
    return () => controller.abort();
  }, [category]);

  // Abort a later page that is still loading when the feed unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const { status, hasMore, nextPage } = state;
  const loadMore = useCallback(async () => {
    if (status === 'loading' || !hasMore) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    const fail = failNext;
    if (fail) setFailNext(false);
    dispatch({ type: 'start' });
    try {
      const page = await fetchFeedPage(nextPage, category, { signal: controller.signal, fail });
      dispatch({ type: 'success', page });
    } catch (error) {
      if (!controller.signal.aborted) dispatch({ type: 'failure', message: errorMessage(error) });
    }
  }, [status, hasMore, nextPage, category, failNext]);

  const { sentinelRef, isSupported } = useInfiniteScroll({
    loadMore,
    // Pause automatic loading after an error, or it would retry in a loop.
    hasMore: hasMore && status !== 'error',
    isLoading: status === 'loading',
    root: viewport,
    rootMargin: '120px',
  });

  const loading = status === 'loading';
  let progress = '';
  if (state.total !== null) {
    progress = hasMore
      ? `Loaded ${state.lastAdded} more products. Showing ${state.items.length} of ${state.total}.`
      : `All ${state.total} products loaded.`;
  }

  return (
    <Panel
      title={category ? `${category} products` : 'All products'}
      description="Scroll inside the list, or use the button below it."
    >
      <div className="spread small">
        <p role="status" className="infinite-scroll-status">
          {progress}
        </p>
        <div className="row">
          {loading ? <Badge tone="info">loading page {nextPage}</Badge> : null}
          {!isSupported ? <Badge tone="warn">no IntersectionObserver</Badge> : null}
        </div>
      </div>

      {!isSupported ? (
        <Callout tone="warn" title="Automatic loading unavailable">
          This browser has no IntersectionObserver, so pages load only with the “Load more” button.
        </Callout>
      ) : null}

      <div
        ref={setViewport}
        className="infinite-scroll-viewport"
        role="region"
        aria-label="Product feed"
        aria-busy={loading}
        tabIndex={0}
      >
        <ul className="infinite-scroll-list" aria-label="Products">
          {state.items.map((product) => (
            <li key={product.id} className="spread">
              <span>{product.name}</span>
              <span className="muted small">
                {product.category} · {priceFormat.format(product.price)}
              </span>
            </li>
          ))}
        </ul>
        {loading && state.items.length === 0 ? <p className="muted">Loading products…</p> : null}
        {!hasMore ? (
          <p className="infinite-scroll-end">You’ve reached the end of the list.</p>
        ) : null}
        <div ref={sentinelRef} className="infinite-scroll-sentinel" aria-hidden="true" />
      </div>

      {state.error ? (
        <Callout tone="danger" title={`Could not load page ${nextPage}`}>
          <div className="row">
            <span role="alert">{state.error}</span>
            <Button size="sm" onClick={() => void loadMore()}>
              Retry
            </Button>
          </div>
        </Callout>
      ) : null}

      <div className="spread">
        {hasMore ? (
          <Button onClick={() => void loadMore()} disabled={loading || status === 'error'}>
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        ) : (
          <span className="muted small">Nothing more to load.</span>
        )}
        <label className="row small">
          <input
            type="checkbox"
            checked={failNext}
            onChange={(event) => setFailNext(event.target.checked)}
          />
          Make the next page request fail
        </label>
      </div>
    </Panel>
  );
}
