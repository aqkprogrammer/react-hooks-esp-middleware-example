import { useCallback, useId, useState } from 'react';
import { Badge, Callout, Panel, ValueTable } from '../../../components/ui';
import { useIntersectionObserver } from '../../../hooks';
import './UseIntersectionObserverDemo.css';

const CARD_COUNT = 12;
const THRESHOLDS = { '0 (any pixel)': 0, '0.5 (half visible)': 0.5, '1 (fully visible)': 1 };
type ThresholdLabel = keyof typeof THRESHOLDS;

/**
 * Cards inside a scroll container light up while they intersect it. The scroll
 * container is the observer `root`, passed in as an element from a callback ref.
 */
export default function UseIntersectionObserverDemo() {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [thresholdLabel, setThresholdLabel] = useState<ThresholdLabel>('0.5 (half visible)');
  const [freeze, setFreeze] = useState(false);
  const [visible, setVisible] = useState<ReadonlySet<number>>(() => new Set());
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set());
  const selectId = useId();

  const report = useCallback((index: number, isVisible: boolean) => {
    setVisible((previous) => {
      if (previous.has(index) === isVisible) return previous;
      const next = new Set(previous);
      if (isVisible) next.add(index);
      else next.delete(index);
      return next;
    });
    if (isVisible)
      setSeen((previous) => (previous.has(index) ? previous : new Set(previous).add(index)));
  }, []);

  // Changing options remounts the cards (see `key`), so start counting afresh.
  const resetStats = () => {
    setVisible(new Set());
    setSeen(new Set());
  };

  return (
    <div className="stack">
      <Panel title="Sentinel cards" description="Scroll inside the box. Visible cards turn green.">
        <div className="row">
          <label htmlFor={selectId}>Threshold</label>
          <select
            id={selectId}
            className="input"
            value={thresholdLabel}
            onChange={(event) => {
              setThresholdLabel(event.target.value as ThresholdLabel);
              resetStats();
            }}
          >
            {Object.keys(THRESHOLDS).map((label) => (
              <option key={label}>{label}</option>
            ))}
          </select>
          <label className="row">
            <input
              type="checkbox"
              checked={freeze}
              onChange={(event) => {
                setFreeze(event.target.checked);
                resetStats();
              }}
            />
            freezeOnceVisible (“seen” tracking)
          </label>
        </div>
        <div
          ref={setRoot}
          className="use-intersection-observer-demo-scroller"
          // Scrollable regions must be keyboard reachable.
          tabIndex={0}
          role="region"
          aria-label="Scrollable list of cards"
        >
          {Array.from({ length: CARD_COUNT }, (_, index) => (
            <SentinelCard
              key={`${index}-${thresholdLabel}-${freeze}`}
              index={index}
              root={root}
              threshold={THRESHOLDS[thresholdLabel]}
              freeze={freeze}
              onVisibilityChange={report}
            />
          ))}
        </div>
        <ValueTable
          rows={{
            'Visible now':
              visible.size === 0
                ? 'none'
                : [...visible]
                    .sort((a, b) => a - b)
                    .map((i) => i + 1)
                    .join(', '),
            'Seen so far': `${seen.size} of ${CARD_COUNT}`,
          }}
        />
      </Panel>
      <Callout title="No scroll listeners">
        The browser computes intersections off the main thread and calls back only when a threshold
        is crossed — far cheaper than reading <code>getBoundingClientRect()</code> on every scroll.
      </Callout>
    </div>
  );
}

interface SentinelCardProps {
  index: number;
  root: Element | null;
  threshold: number;
  freeze: boolean;
  onVisibilityChange: (index: number, isVisible: boolean) => void;
}

function SentinelCard({ index, root, threshold, freeze, onVisibilityChange }: SentinelCardProps) {
  const { ref, isIntersecting, entry, isSupported } = useIntersectionObserver<HTMLDivElement>({
    root,
    threshold,
    freezeOnceVisible: freeze,
    // Wait for the scroll container; observing the viewport first would be wasted work.
    enabled: root !== null,
    onChange: (next) => onVisibilityChange(index, next.isIntersecting),
  });
  return (
    <div
      ref={ref}
      className="use-intersection-observer-demo-card"
      data-visible={isIntersecting}
      data-testid={`card-${index + 1}`}
    >
      <strong>Card {index + 1}</strong>{' '}
      <Badge tone={isIntersecting ? 'success' : 'neutral'}>
        {isIntersecting ? 'visible' : 'hidden'}
      </Badge>
      <p className="small muted">
        {isSupported
          ? `ratio ${entry ? entry.intersectionRatio.toFixed(2) : '—'}`
          : 'IntersectionObserver is not supported'}
      </p>
    </div>
  );
}
