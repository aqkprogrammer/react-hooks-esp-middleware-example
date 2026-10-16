// Runs in the "ssr" Vitest project (Node, no DOM): advanced hooks must render
// their documented server values without touching browser globals.
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createStore } from './createStore';
import { FeatureFlagProvider } from './FeatureFlagProvider';
import { defineFeatureFlags } from './featureFlags';
import { useExternalStore } from './useExternalStore';
import { useFeatureFlag } from './useFeatureFlag';
import { useObservable, type ObservableLike } from './useObservable';
import { usePerformanceMeasure } from './usePerformanceMeasure';
import { usePermission } from './usePermission';
import { useStateMachine } from './useStateMachine';
import { useSubscription } from './useSubscription';
import { useWebWorker } from './useWebWorker';

const flags = defineFeatureFlags({ beta: false });
const store = createStore({ count: 3 });
const never: ObservableLike<number> = { subscribe: () => ({ unsubscribe: () => {} }) };
const source = {
  subscribe: () => () => {},
  getCurrentValue: (): string => {
    throw new Error('browser only');
  },
  getServerValue: () => 'server',
};

function Advanced() {
  const beta = useFeatureFlag(flags, 'beta');
  const count = useExternalStore(store, (state) => state.count);
  const observed = useObservable(never, 7);
  const permission = usePermission('geolocation');
  const machine = useStateMachine({ initial: 'idle', context: null, states: { idle: {} } });
  const subscribed = useSubscription(source);
  const worker = useWebWorker<number, number>('/w.js');
  const perf = usePerformanceMeasure();
  return (
    <p>
      {[
        beta,
        count,
        observed.value,
        permission.status,
        machine.value,
        subscribed,
        worker.isSupported,
        perf.isSupported,
      ].join('|')}
    </p>
  );
}

describe('advanced hooks on the server', () => {
  it('render defaults without window', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToString(
      <FeatureFlagProvider definition={flags} load={async () => ({ beta: true })}>
        <Advanced />
      </FeatureFlagProvider>,
    );
    expect(html).toBe('<p>false|3|7|unsupported|idle|server|false|false</p>');
  });
});
