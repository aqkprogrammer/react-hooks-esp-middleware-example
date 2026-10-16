import type { Dispatch } from '../../../../middleware/reducer/types';
import { types, type AccumulatorsAction } from './types';

// We can use actions as a proxy for dispatch in views.
export const createActions = (dispatch: Dispatch<AccumulatorsAction>) => ({
  addAccumulatorIfNotInList: (accumulator: string) =>
    dispatch({ type: types.ADD_TO_ACCUMULATOR_LIST, payload: accumulator }),
  typingAccumulator: (accumulatorInput: string) =>
    dispatch({ type: types.TYPING_ACCUMULATOR, payload: accumulatorInput }),
  removeAccumulator: (accumulator: string) =>
    dispatch({ type: types.REMOVE_FROM_ACCUMULATOR_LIST, payload: accumulator }),
  dismissNotice: () => dispatch({ type: types.DISMISS_NOTICE }),
});

export type AccumulatorsActions = ReturnType<typeof createActions>;
