import { DisposableBase, ObservationStage, type EventEnvelope, type Router } from 'esp-js';
import { types, type EspEventAction, type EspLifecycleAction } from './espMiddleware';

export type EspStage = 'preview' | 'normal' | 'committed' | 'final';

export interface EspStageInfo {
  modelId: string;
  eventType: string;
  event: unknown;
  stage: EspStage | 'preProcess' | 'postProcess' | 'canceled' | 'error';
  detail?: string;
}

/**
 * Decides at the preview stage whether an event may continue. Returning
 * `false` cancels it: it never reaches the normal/final stages and therefore
 * never reaches the reducer.
 */
export type EspEventFilter = (event: unknown, eventType: string) => boolean;

export interface EspBridgeOptions {
  router: Router;
  modelId: string;
  /** Receives router events as `{ type: eventType, payload: event }` and lifecycle actions. */
  dispatch: (action: EspEventAction | EspLifecycleAction) => void;
  /**
   * Event types this model observes. esp-js 8 only dispatches events to a
   * model that explicitly observes them — events for unobserved types are dropped.
   */
  eventTypes: readonly string[];
  /** Stage whose events are forwarded to `dispatch`. Default `final`. */
  stage?: EspStage;
  /** Per-event-type preview filters (cancel = drop the event). */
  filters?: Readonly<Record<string, EspEventFilter>>;
  /** Event types that should be committed at the normal stage (enables the `committed` stage). */
  commitEventTypes?: readonly string[];
  /** Forward the pre/post-process lifecycle to `dispatch` (default true, as in the original). */
  forwardLifecycle?: boolean;
  /** Trace every stage — useful for debug panels. Must not throw. */
  onStage?: (info: EspStageInfo) => void;
  /**
   * Called when `dispatch` throws while handling an event. Without this guard
   * an exception inside an esp-js observer HALTS the router permanently (its
   * status becomes `Terminal` and every later publish throws).
   */
  onError?: (error: unknown, info: EspStageInfo) => void;
}

const stageMap: Record<EspStage, ObservationStage> = {
  preview: ObservationStage.preview,
  normal: ObservationStage.normal,
  committed: ObservationStage.committed,
  final: ObservationStage.final,
};

/**
 * The model registered with the router for one React store. It owns no
 * state — React does — it only forwards esp-js lifecycle callbacks.
 * Kept from the original `EspEventBridgeModel`, now extending the public
 * `DisposableBase` export instead of importing esp-js sources.
 */
export class EspEventBridgeModel extends DisposableBase {
  constructor(
    public readonly modelId: string,
    private readonly forward: (action: EspLifecycleAction) => void,
    private readonly trace?: (info: EspStageInfo) => void,
  ) {
    super();
  }

  preProcess(): void {
    this.trace?.({ modelId: this.modelId, eventType: '', event: undefined, stage: 'preProcess' });
    this.forward({ type: types.PREPROCESS_ACTION });
  }

  postProcess(eventTypes: string[]): void {
    this.trace?.({
      modelId: this.modelId,
      eventType: eventTypes.join(', '),
      event: undefined,
      stage: 'postProcess',
    });
    this.forward({ type: types.POSTPROCESS_ACTION, payload: [...eventTypes] });
  }
}

/**
 * Registers a bridge model with the router and subscribes to its events.
 * Returns a dispose function that unsubscribes and removes the model.
 *
 * Throws if `modelId` is already registered: two stores sharing an id would
 * receive each other's events.
 */
export function registerEspBridge(options: EspBridgeOptions): () => void {
  const {
    router,
    modelId,
    dispatch,
    eventTypes,
    stage = 'final',
    filters = {},
    commitEventTypes = [],
    forwardLifecycle = true,
    onStage,
    onError,
  } = options;

  if (router.isModelRegistered(modelId)) {
    throw new Error(`ESP model "${modelId}" is already registered with this router.`);
  }

  const safeTrace = (info: EspStageInfo) => {
    try {
      onStage?.(info);
    } catch {
      // Tracing must never halt the router.
    }
  };

  const safeDispatch = (action: EspEventAction | EspLifecycleAction, info: EspStageInfo) => {
    try {
      dispatch(action);
    } catch (error) {
      safeTrace({ ...info, stage: 'error', detail: String(error) });
      if (onError) onError(error, info);
      else console.error(`[esp bridge] ${modelId} failed to handle ${info.eventType}`, error);
    }
  };

  const model = new EspEventBridgeModel(
    modelId,
    (action) => {
      if (!forwardLifecycle) return;
      safeDispatch(action, { modelId, eventType: action.type, event: undefined, stage: 'final' });
    },
    safeTrace,
  );
  router.addModel(modelId, model);

  const subscriptions: Array<{ dispose(): void }> = [];
  for (const eventType of new Set(eventTypes)) {
    const filter = filters[eventType];
    const commits = commitEventTypes.includes(eventType);

    // Preview: filtering / cancellation.
    subscriptions.push(
      router
        .getEventObservable<unknown, EspEventBridgeModel>(
          modelId,
          eventType,
          ObservationStage.preview,
        )
        .subscribe((envelope: EventEnvelope<unknown, EspEventBridgeModel>) => {
          const info: EspStageInfo = {
            modelId,
            eventType,
            event: envelope.event,
            stage: 'preview',
          };
          safeTrace(info);
          let allowed = true;
          try {
            allowed = filter ? filter(envelope.event, eventType) : true;
          } catch (error) {
            allowed = false;
            onError?.(error, info);
          }
          if (!allowed) {
            envelope.context.cancel();
            safeTrace({ ...info, stage: 'canceled' });
          }
        }),
    );

    // Normal: optionally commit so the `committed` stage runs.
    subscriptions.push(
      router
        .getEventObservable<unknown, EspEventBridgeModel>(
          modelId,
          eventType,
          ObservationStage.normal,
        )
        .subscribe((envelope: EventEnvelope<unknown, EspEventBridgeModel>) => {
          safeTrace({ modelId, eventType, event: envelope.event, stage: 'normal' });
          if (commits) envelope.context.commit();
        }),
    );

    if (commits) {
      subscriptions.push(
        router
          .getEventObservable<unknown, EspEventBridgeModel>(
            modelId,
            eventType,
            ObservationStage.committed,
          )
          .subscribe((envelope: EventEnvelope<unknown, EspEventBridgeModel>) => {
            safeTrace({ modelId, eventType, event: envelope.event, stage: 'committed' });
          }),
      );
    }

    if (stage !== 'final') {
      subscriptions.push(
        router
          .getEventObservable<unknown, EspEventBridgeModel>(
            modelId,
            eventType,
            ObservationStage.final,
          )
          .subscribe((envelope: EventEnvelope<unknown, EspEventBridgeModel>) => {
            safeTrace({ modelId, eventType, event: envelope.event, stage: 'final' });
          }),
      );
    }

    // Bridge the event into the React store at the chosen stage.
    subscriptions.push(
      router
        .getEventObservable<unknown, EspEventBridgeModel>(modelId, eventType, stageMap[stage])
        .subscribe((envelope: EventEnvelope<unknown, EspEventBridgeModel>) => {
          const info: EspStageInfo = { modelId, eventType, event: envelope.event, stage };
          if (stage === 'final') safeTrace(info);
          safeDispatch({ type: eventType, payload: envelope.event }, info);
        }),
    );
  }

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    subscriptions.forEach((subscription) => subscription.dispose());
    if (router.isModelRegistered(modelId)) router.removeModel(modelId);
    model.dispose();
  };
}
