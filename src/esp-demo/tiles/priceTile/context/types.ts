import { types as espTypes } from "../../../common/middleware/espMiddleware";
import { types as commonTypes } from "../../../common/types/types";

export const types = {
  esp: espTypes,
  common: commonTypes,
  SUBSCRIBE_PRICE: "SUBSCRIBE_PRICE",
  UNSUBSCRIBE_PRICE: "UNSUBSCRIBE_PRICE",
  PRICE_UNSUBSCRIBED: "PRICE_UNSUBSCRIBED",
  UNSUBSCRIBE_ALL_PRICES: "UNSUBSCRIBE_ALL_PRICES",
  ALL_PRICES_UNSUBSCRIBED: "ALL_PRICES_UNSUBSCRIBED",
  PRICE_UPDATE: "PRICE_UPDATE",
  CLICKED: "CLICKED",
  TYPING_PRICE: "TYPING_PRICE"
};
