import { Component, Suspense, useState, type ReactNode } from 'react';
import { Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { createResourceCache, fetchJson, useResource } from '../../../hooks';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
}

// Module level: the cache must outlive renders so `use()` sees the same promise.
const products = createResourceCache<Product>({ maxEntries: 50 });
const loadProduct = (key: string) => fetchJson<Product>(`/api/products/${key}?delay=800`);

const IDS = [1, 2, 3, 9999] as const;

export default function UseResourceDemo() {
  const [id, setId] = useState<number>(1);
  // Changing the boundary key resets it after an error.
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    products.invalidate(String(id));
    setAttempt((a) => a + 1);
  };

  return (
    <div className="stack">
      <Panel
        title="Product"
        description="First visits suspend for ~0.8 s; going back to a product is instant (cached promise)."
      >
        <div className="row" role="group" aria-label="Products">
          {IDS.map((option) => (
            <Button
              key={option}
              variant={option === id ? 'primary' : 'secondary'}
              aria-pressed={option === id}
              onClick={() => setId(option)}
            >
              {option === 9999 ? 'Missing product (404)' : `Product ${option}`}
            </Button>
          ))}
          <Button
            variant="ghost"
            onClick={() => {
              products.invalidate();
              setAttempt((a) => a + 1);
            }}
          >
            Clear cache
          </Button>
        </div>
        <ErrorBoundary key={`${id}-${attempt}`} onRetry={retry}>
          <Suspense fallback={<p className="muted">Loading product {id}…</p>}>
            <ProductCard id={id} />
          </Suspense>
        </ErrorBoundary>
      </Panel>
      <Callout title="A teaching tool">
        This shows what Suspense needs: one stable promise per key. Real apps should let a framework
        loader or TanStack Query / SWR own caching, invalidation and SSR.
      </Callout>
    </div>
  );
}

function ProductCard({ id }: { id: number }) {
  const product = useResource(products, String(id), loadProduct);
  return (
    <ValueTable
      label="Product details"
      rows={{
        name: product.name,
        category: product.category,
        price: `$${product.price.toFixed(2)}`,
        rating: product.rating,
      }}
    />
  );
}

interface BoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}

class ErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <Callout tone="danger" title="Could not load the product">
        {this.state.error.message}{' '}
        <Button size="sm" onClick={this.props.onRetry}>
          Retry
        </Button>
      </Callout>
    );
  }
}
