/**
 * There should be another level to this demo, Workspace > Package > Tile, but I've just merged
 * the concept of package into workspace (shell) to keep it simple.
 */
import { EventEnvelope, ObservationStage, Router } from "esp-js";

/**
 * DisposableBase needs to be imported as source as I get a "cannot be invoked without 'new' error"
 * for the super() call...something to do with an es6 class trying to extend an es5 class I think.
 * Might be a way to fix it via package.json > browserslist or the tsconfig.json file, which I've
 * aligned to what we currently have in the dtp-client-web project.
 */
import { DisposableBase } from "esp-js/src/system/disposables/disposableBase";

export const espRouter = new Router(); // Sould be the shared workspace / shell router

export const types = {
  PUBLISH_ACTION: "ESP_PUBLISH_ACTION",
  BROADCAST_ACTION: "ESP_BROADCAST_ACTION",
  PREPROCESS_ACTION: "ESP_PREPROCESS_ACTION",
  POSTPROCESS_ACTION: "ESP_POSTPROCESS_ACTION"
};

/**
 * A helper that can be spread into tile actions to add esp actions
 */
export const actions = (dispatch: any) => ({
  espPublish: (eventType: string, event: any) => {
    dispatch({
      type: types.PUBLISH_ACTION,
      payload: {
        eventType,
        event
      }
    });
  },
  espBroadcast: (eventType: string, event: any) => {
    dispatch({
      type: types.BROADCAST_ACTION,
      payload: {
        eventType,
        event
      }
    });
  }
});

// Keeping this simple, but chould be expanded to have more of the ModelBase type methods
class EspEventBridgeModel extends DisposableBase {
  constructor(public readonly modelId: string, public readonly dispatch: any) {
    super();
  }
  preProcess() {
    console.log(`EspEventBridgeModel(${this.modelId}).preProcess`);
    this.dispatch({ type: types.PREPROCESS_ACTION });
  }
  postProcess(eventTypes: string[]) {
    console.log(`EspEventBridgeModel(${this.modelId}).postProcess`, eventTypes);
    this.dispatch({ type: types.POSTPROCESS_ACTION, payload: eventTypes });
  }
  /**
   * Can be used for logging event stages, but gets a bit noisy on the console
   */
  // eventDispatched(eventType: string, event: any, stage: ObservationStage) {
  //   console.log(
  //     `EspEventBridgeModel(${this.modelId}).eventDispatched`,
  //     `Stage: (${stage})`,
  //     eventType,
  //     event
  //   );
  // }
}

const registerEventBridge = (model: EspEventBridgeModel) => {
  const { isDisposed, modelId } = model;
  if (!isDisposed && !espRouter.isModelRegistered(modelId)) {
    console.log(`Adding model with id ${modelId} to ESP router (Tile)`);
    espRouter.addModel(modelId, model);
    model.addDisposable(() => {
      console.log(`Removing model with id ${modelId} from ESP router`);
      espRouter.removeModel(modelId);
    });
    espRouter
      .getAllEventsObservable(ObservationStage.final) // Only bridging final events right now
      .filter((env: EventEnvelope<any, any>) => env.modelId === modelId)
      .subscribe((env: EventEnvelope<any, any>) => {
        // Bridge the event with dispatch from the useReducer hook
        console.log(`Bridging router event ${modelId}`, env);
        model.dispatch({ type: env.eventType, payload: env.event });
      });
  }
};

/**
 * If needed you can achieve esp like observation stages using middleware at the
 * workspace, package or tile level, ie. dealing with an event first before
 * allowing it to hit the reducers, cancelling it completely etc.
 */
export const applyESPMiddleware = (modelId: string, dispatch: any) => {
  const eventBridgeModel = new EspEventBridgeModel(modelId, dispatch);

  registerEventBridge(eventBridgeModel);

  const actionHandler = action => {
    switch (action.type) {
      case types.PUBLISH_ACTION: {
        console.log("Publish an event on the ESP router", action.payload);
        const { eventType, event } = action.payload;
        espRouter.publishEvent(modelId, eventType, event);
        break;
      }
      case types.BROADCAST_ACTION: {
        console.log("Broadcast an event on the ESP router", action.payload);
        const { eventType, event } = action.payload;
        espRouter.broadcastEvent(eventType, event);
        break;
      }
      default:
        dispatch(action);
    }
  };

  const disposeHandler = () => {
    console.log("Disposing ESP middleware");
    eventBridgeModel.dispose();
  };

  return [actionHandler, disposeHandler];
};
