// Runs in the Node "ssr" project: the timing and state hooks must render on
// the server without touching window/document or scheduling timers.
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useControllableState } from '../state/useControllableState';
import { usePrevious } from '../state/usePrevious';
import { useQueue } from '../state/useQueue';
import { useAnimationFrame } from './useAnimationFrame';
import { useDebounce } from './useDebounce';
import { useIdle } from './useIdle';
import { useInterval } from './useInterval';
import { useLongPress } from './useLongPress';
import { useThrottle } from './useThrottle';
import { useTimeout } from './useTimeout';

function Everything() {
  const debounced = useDebounce('query', 300);
  const throttled = useThrottle(1, 100);
  const { isIdle } = useIdle(1000);
  const { isPending } = useTimeout(() => {}, 1000);
  useInterval(() => {}, 1000);
  useAnimationFrame(() => {});
  const handlers = useLongPress(() => {});
  const [value] = useControllableState({ defaultValue: 'uncontrolled' });
  const previous = usePrevious(value);
  const { size } = useQueue([1, 2]);
  return (
    <button type="button" {...handlers}>
      {[debounced, throttled, isIdle, isPending, value, String(previous), size].join('|')}
    </button>
  );
}

describe('timing & state hooks on the server', () => {
  it('render initial values without browser globals', () => {
    expect(typeof window).toBe('undefined');
    expect(renderToString(<Everything />)).toBe(
      '<button type="button">query|1|false|true|uncontrolled|undefined|2</button>',
    );
  });
});
