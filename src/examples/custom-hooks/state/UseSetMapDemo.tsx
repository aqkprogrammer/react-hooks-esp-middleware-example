import { Button, Panel, ValueTable, show } from '../../../components/ui';
import { useMap, useSet } from '../../../hooks';

const TAGS = ['react', 'hooks', 'testing', 'performance', 'a11y'] as const;
const PRODUCTS = [
  { id: 'kb', name: 'Keyboard' },
  { id: 'ms', name: 'Mouse' },
  { id: 'mn', name: 'Monitor' },
] as const;

export default function UseSetMapDemo() {
  const [selected, tags] = useSet<string>(['react']);
  const [cart, cartActions] = useMap<string, number>();
  const totalItems = [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);

  return (
    <div className="stack">
      <Panel title="useSet — tag filter" description="Each change creates a new Set instance.">
        <div className="row" role="group" aria-label="Tags">
          {TAGS.map((tag) => (
            <Button
              key={tag}
              size="sm"
              aria-pressed={selected.has(tag)}
              variant={selected.has(tag) ? 'primary' : 'secondary'}
              onClick={() => tags.toggle(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
        <div className="row">
          <Button size="sm" onClick={tags.clear}>
            Clear
          </Button>
          <Button size="sm" variant="ghost" onClick={tags.reset}>
            Reset
          </Button>
        </div>
        <ValueTable
          label="Selected tags"
          rows={{ size: selected.size, values: show([...selected]) }}
        />
      </Panel>

      <Panel title="useMap — cart" description="Quantities keyed by product id.">
        <ul className="list" aria-label="Products">
          {PRODUCTS.map((product) => {
            const quantity = cart.get(product.id) ?? 0;
            return (
              <li key={product.id} className="spread">
                <span>
                  {product.name} <span className="muted">× {quantity}</span>
                </span>
                <span className="row">
                  <Button
                    size="sm"
                    aria-label={`Add one ${product.name}`}
                    onClick={() => cartActions.update(product.id, (current = 0) => current + 1)}
                  >
                    +1
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    aria-label={`Remove ${product.name} from cart`}
                    disabled={!cart.has(product.id)}
                    onClick={() => cartActions.remove(product.id)}
                  >
                    Remove
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="row">
          <Button size="sm" onClick={cartActions.clear}>
            Empty cart
          </Button>
        </div>
        <ValueTable
          label="Cart"
          rows={{ entries: show([...cart.entries()]), 'total items': totalItems }}
        />
      </Panel>
    </div>
  );
}
