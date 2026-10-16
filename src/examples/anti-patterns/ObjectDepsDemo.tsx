import { useEffect, useId, useState } from 'react';
import { Button, Callout, Panel, ValueTable } from '../../components/ui';

interface ProductPage {
  items: { id: number; name: string }[];
  total: number;
}

const categories = ['Books', 'Electronics', 'Garden', 'Kitchen'] as const;

/**
 * Corrected version of broken/ObjectDepsLoop.tsx. The effect depends on the
 * primitive values it uses (`category`, `pageSize`) and builds the request
 * options *inside* the effect, so re-renders that don't change them never
 * re-run it — and the effect's own setState can't feed back into it.
 */
export default function ObjectDepsDemo() {
  const [category, setCategory] = useState<string>('Books');
  const [pageSize, setPageSize] = useState(5);
  const [unrelated, setUnrelated] = useState(0);
  const [page, setPage] = useState<ProductPage | null>(null);
  const [requests, setRequests] = useState(0);
  const categoryId = useId();

  useEffect(() => {
    const controller = new AbortController();
    // ✅ The options object is created inside the effect.
    const options = { category, pageSize };
    const params = new URLSearchParams({
      category: options.category,
      pageSize: String(options.pageSize),
    });
    fetch(`/api/products?${params}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<ProductPage>)
      .then(
        (body) => {
          setPage(body);
          setRequests((count) => count + 1);
        },
        (error: unknown) => {
          if (!controller.signal.aborted) throw error;
        },
      );
    return () => controller.abort();
  }, [category, pageSize]);

  return (
    <div className="stack">
      <Panel
        title="Products"
        description="Re-render as often as you like: requests only happen when category or page size change."
      >
        <div className="row">
          <label htmlFor={categoryId}>Category</label>
          <select
            id={categoryId}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Button onClick={() => setPageSize((size) => (size === 5 ? 10 : 5))}>
            Page size: {pageSize}
          </Button>
          <Button onClick={() => setUnrelated((value) => value + 1)}>
            Unrelated re-render ({unrelated})
          </Button>
        </div>
        <ValueTable
          rows={{
            'Completed requests': requests,
            'Products in category': page ? page.total : '…',
            'Shown on this page': page ? page.items.length : '…',
          }}
        />
      </Panel>
      <Callout title="If you really need an object dependency">
        Memoise it with <code>useMemo</code> keyed on its primitives, or pass the primitives into
        the effect. Never depend on an object literal created during render.
      </Callout>
    </div>
  );
}
