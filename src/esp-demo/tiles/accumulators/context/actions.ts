import { actions as espActions } from "../../../common/middleware/espMiddleware";
import { types } from "./types";

// We can use actions as a proxy for dispatch in views
export const useActions = (state, dispatch) => ({
  addAccumulatorIfNotInList: accumulator => {
    const index = state.accumulatorList.indexOf(accumulator);
    if (index > -1) {
      alert("Accumulator is defined in list");
    } else {
      dispatch({ type: types.ADD_TO_ACCUMULATOR_LIST, payload: accumulator });
    }
  },
  typingAccumulator: accumulatorInput =>
    dispatch({
      type: types.TYPING_ACCUMULATOR,
      payload: accumulatorInput
    }),
  removeAccumulator: accumulator =>
    dispatch({
      type: types.REMOVE_FROM_ACCUMULATOR_LIST,
      payload: accumulator
    }),
  ...espActions(dispatch)
});
