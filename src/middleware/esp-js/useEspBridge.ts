import { useEffect } from 'react';
import { useLatest } from '../../hooks/state/useLatest';
import { registerEspBridge, type EspBridgeOptions } from './bridge';

export type UseEspBridgeOptions = Omit<EspBridgeOptions, 'router'> & {
  router: EspBridgeOptions['router'];
};

/**
 * Registers an esp-js bridge model for the lifetime of the component.
 *
 * - Registration happens in an effect, never during render, so React may
 *   render (and discard) the component any number of times safely.
 * - Strict Mode's mount → unmount → mount check registers, removes, and
 *   re-registers the model — proving the cleanup is correct.
 * - `dispatch`, `filters`, `onStage` and `onError` are read through a ref, so
 *   changing them does not re-register. Changing `router`, `modelId`,
 *   `eventTypes`, `stage` or `commitEventTypes` does.
 */
export function useEspBridge(options: UseEspBridgeOptions): void {
  const latest = useLatest(options);
  const { router, modelId, stage, forwardLifecycle } = options;
  const eventTypesKey = options.eventTypes.join('\u0000');
  const commitKey = (options.commitEventTypes ?? []).join('\u0000');

  useEffect(() => {
    const eventTypes = eventTypesKey ? eventTypesKey.split('\u0000') : [];
    const commitEventTypes = commitKey ? commitKey.split('\u0000') : [];
    return registerEspBridge({
      router,
      modelId,
      eventTypes,
      commitEventTypes,
      ...(stage ? { stage } : {}),
      ...(forwardLifecycle === undefined ? {} : { forwardLifecycle }),
      dispatch: (action) => latest.current.dispatch(action),
      // Wrap each filter so the latest one is used without re-registering.
      filters: Object.fromEntries(
        eventTypes.map((eventType) => [
          eventType,
          (event: unknown) => latest.current.filters?.[eventType]?.(event, eventType) ?? true,
        ]),
      ),
      onStage: (info) => latest.current.onStage?.(info),
      onError: (error, info) => {
        const onError = latest.current.onError;
        if (onError) onError(error, info);
        else
          console.error(`[esp bridge] ${info.modelId} failed to handle ${info.eventType}`, error);
      },
    });
  }, [router, modelId, eventTypesKey, commitKey, stage, forwardLifecycle, latest]);
}
