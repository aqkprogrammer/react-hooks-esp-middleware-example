import type { EspStoreAction } from '../../../../middleware/esp-js';
import { types as espTypes } from '../../../../middleware/esp-js/espMiddleware';
import { types as commonTypes, type KeyPressedAction } from '../../../common/types/types';

export const types = {
  esp: espTypes,
  common: commonTypes,
  SET_ACCUMULATOR_LIST: 'SET_ACCUMULATOR_LIST',
  ADD_TO_ACCUMULATOR_LIST: 'ADD_TO_ACCUMULATOR_LIST',
  REMOVE_FROM_ACCUMULATOR_LIST: 'REMOVE_FROM_ACCUMULATOR_LIST',
  TYPING_ACCUMULATOR: 'TYPING_ACCUMULATOR',
  DISMISS_NOTICE: 'DISMISS_NOTICE',
} as const;

export type AccumulatorsOwnAction =
  | { type: typeof types.SET_ACCUMULATOR_LIST; payload: string[] }
  | { type: typeof types.ADD_TO_ACCUMULATOR_LIST; payload: string }
  | { type: typeof types.REMOVE_FROM_ACCUMULATOR_LIST; payload: string }
  | { type: typeof types.TYPING_ACCUMULATOR; payload: string }
  | { type: typeof types.DISMISS_NOTICE }
  | KeyPressedAction;

export type AccumulatorsAction = EspStoreAction<AccumulatorsOwnAction>;
