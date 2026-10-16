/**
 * INTENTIONALLY BROKEN — shown as text only, never imported or executed.
 * Anti-pattern: an object created during render used as an effect
 * dependency, while the effect sets state. Every render creates a new object
 * → the effect runs → setState → render → new object → … an infinite loop
 * of requests. `react-hooks/exhaustive-deps` warns about `options`.
 * Corrected version: ../ObjectDepsDemo.tsx
 */
import { useEffect, useState } from 'react';

export function ProductList({ category }: { category: string }) {
  const [products, setProducts] = useState<unknown[]>([]);

  // ❌ New object identity on every render.
  const options = { category, pageSize: 20 };

  useEffect(() => {
    fetch(`/api/products?category=${options.category}&pageSize=${options.pageSize}`)
      .then((response) => response.json())
      .then((page: { items: unknown[] }) => setProducts(page.items)); // → re-render → new options
  }, [options]);

  return <p>{products.length} products</p>;
}
