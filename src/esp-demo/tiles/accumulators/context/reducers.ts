import { produce } from 'immer';
import { deleteKey, insertKey } from '../../../common/keys';
import { types, type AccumulatorsAction } from './types';

export interface AccumulatorsState {
  accumulatorInput: string;
  accumulatorList: string[];
  /** Replaces the original `alert()` for duplicates. */
  notice: string | null;
  lastEspEvents: string[];
}

export const initialState: AccumulatorsState = {
  accumulatorInput: '',
  accumulatorList: ['Some Accumulator', 'Other Accumulator'],
  notice: null,
  lastEspEvents: [],
};

function add(draft: AccumulatorsState, accumulator: string) {
  const value = accumulator.trim();
  if (!value) return;
  if (draft.accumulatorList.includes(value)) {
    draft.notice = `"${value}" is already in the list`;
    return;
  }
  draft.accumulatorList.push(value);
  draft.notice = null;
  if (value === draft.accumulatorInput.trim()) draft.accumulatorInput = '';
}

export const reducer = produce((draft: AccumulatorsState, action: AccumulatorsAction) => {
  switch (action.type) {
    case types.TYPING_ACCUMULATOR:
      draft.accumulatorInput = action.payload;
      return;
    case types.SET_ACCUMULATOR_LIST:
      draft.accumulatorList = action.payload;
      return;
    case types.ADD_TO_ACCUMULATOR_LIST:
      add(draft, action.payload);
      return;
    case types.REMOVE_FROM_ACCUMULATOR_LIST:
      draft.accumulatorList = draft.accumulatorList.filter((item) => item !== action.payload);
      return;
    case types.DISMISS_NOTICE:
      draft.notice = null;
      return;
    // Routed back from the esp-js router: Insert is *broadcast* (all tiles
    // receive it), Delete is *published* (only this tile receives it).
    case types.common.KEY_PRESSED:
      if (action.payload.key === deleteKey) {
        draft.accumulatorList.splice(0, 1);
      } else if (action.payload.key === insertKey) {
        add(draft, draft.accumulatorInput);
      }
      return;
    case types.esp.POSTPROCESS_ACTION:
      draft.lastEspEvents = action.payload;
      return;
  }
});
