import type { EspStoreAction } from '../../../../middleware/esp-js';
import { types as espTypes } from '../../../../middleware/esp-js/espMiddleware';
import { ACTION_TYPES as streamTypes } from '../../../common/middleware/streamMiddleware';
import type { PriceTick } from '../../../common/services/ccyPairPriceService';
import { types as commonTypes, type KeyPressedAction } from '../../../common/types/types';

export const types = {
  esp: espTypes,
  common: commonTypes,
  stream: streamTypes,
  SUBSCRIBE_PRICE: 'SUBSCRIBE_PRICE',
  UNSUBSCRIBE_PRICE: 'UNSUBSCRIBE_PRICE',
  PRICE_UNSUBSCRIBED: 'PRICE_UNSUBSCRIBED',
  UNSUBSCRIBE_ALL_PRICES: 'UNSUBSCRIBE_ALL_PRICES',
  ALL_PRICES_UNSUBSCRIBED: 'ALL_PRICES_UNSUBSCRIBED',
  PRICE_UPDATE: 'PRICE_UPDATE',
  CLICKED: 'CLICKED',
  TYPING_PRICE: 'TYPING_PRICE',
} as const;

export type PriceOwnAction =
  | { type: typeof types.SUBSCRIBE_PRICE; payload: string }
  | { type: typeof types.UNSUBSCRIBE_PRICE; payload: string }
  | { type: typeof types.PRICE_UNSUBSCRIBED; payload: string }
  | { type: typeof types.UNSUBSCRIBE_ALL_PRICES }
  | { type: typeof types.ALL_PRICES_UNSUBSCRIBED }
  | { type: typeof types.PRICE_UPDATE; payload: PriceTick }
  | { type: typeof types.CLICKED }
  | { type: typeof types.TYPING_PRICE; payload: string }
  | { type: typeof streamTypes.ERROR; payload: string }
  | KeyPressedAction;

export type PriceAction = EspStoreAction<PriceOwnAction>;
