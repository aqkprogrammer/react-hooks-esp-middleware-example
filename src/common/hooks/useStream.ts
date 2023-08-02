import { Observable } from "rxjs";
import { Action } from "../types/action";

export type StreamHandler = (input: Observable<Action>) => Observable<Action>;
export interface StreamHandlerMap {
  [key: string]: StreamHandler;
}

export const ACTION_TYPES = {
  ERROR: "UNEXPECTED_ERROR"
};

// TODO: Clean up observables on individual unsubscribes
const observables = [];

export function useStream<TState>(
  state: TState,
  dispatch: any,
  map: StreamHandlerMap,
  cancelAllActionType?: string
) {
  const cancelAllHandler = (action?: Action) => {
    console.warn(`Unsubscribing observables (${observables.length})`);
    observables.forEach(obs => obs.unsubscribe());
    observables.length = 0;
    if (action) {
      dispatch(action);
    }
  };
  const actionHandler = (action: Action) => {
    dispatch(action);
    const streamHandler = map[action.type];
    if (streamHandler) {
      console.info("Creating observer for", action);
      const obs = streamHandler(
        Observable.create(observer => observer.next(action))
      ).subscribe(
        res => dispatch(res),
        err =>
          dispatch({
            type: ACTION_TYPES.ERROR,
            payload: err
          })
      );
      observables.push(obs);
    }
    if (cancelAllActionType && action.type === cancelAllActionType) {
      cancelAllHandler();
    }
  };
  return [actionHandler, cancelAllHandler];
}
