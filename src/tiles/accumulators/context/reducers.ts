import * as uuid from "uuid";
import produce from "immer";
import { types } from "./types";

export interface AccumulatorsState {
  modelId: string; // Each tile will need a model id to register with ESP
  accumulatorInput: string;
  accumulatorList: string[];
  notionalField: any; // TODO: shortcode testing, 1M > 1,000,000 etc
}

export const initialState: AccumulatorsState = {
  modelId: `accumulators-id-${uuid.v4()}`,
  accumulatorInput: "",
  accumulatorList: ["Some Accumulator", "Other Accumulator"],
  notionalField: null
};

export const reducer = produce((draft, action) => {
  console.log("Accumulators Reducer", {
    oldState: JSON.stringify(draft),
    type: action.type,
    payload: action.payload
  });
  switch (action.type) {
    case types.TYPING_ACCUMULATOR:
      draft.accumulatorInput = action.payload;
      return;
    case types.SET_ACCUMULATOR_LIST:
      draft.accumulatorList = action.payload;
      return;
    case types.ADD_TO_ACCUMULATOR_LIST:
      draft.accumulatorList.push(action.payload);
      if (action.payload === draft.accumulatorInput) {
        delete draft.accumulatorInput;
      }
      return;
    case types.REMOVE_FROM_ACCUMULATOR_LIST:
      draft.accumulatorList = draft.accumulatorList.filter(
        accumulator => accumulator !== action.payload
      );
      return;
    case types.common.KEY_PRESSED: {
      console.log('acc - types.common.KEY_PRESSED', action.payload.key)
      switch (action.payload.key) {
        case "Delete":
          if (!draft.accumulatorList.length) {
            return;
          }
          draft.accumulatorList.splice(0, 1);
          return;
        case "Insert":
          if (!draft.accumulatorInput) {
            return;
          }
          draft.accumulatorList.push(draft.accumulatorInput);
          delete draft.accumulatorInput;
          return;
      }
      return;
    }
    case types.esp.POSTPROCESS_ACTION:
      const eventTypes: string[] = action.payload;
      console.log(
        "Accumulators Reducer opting in to handle esp.POSTPROCESS_ACTION"
      );
      if (eventTypes.indexOf(types.common.KEY_PRESSED) > -1) {
        console.log("User pressed a key");
      }
      return;
  }
});
