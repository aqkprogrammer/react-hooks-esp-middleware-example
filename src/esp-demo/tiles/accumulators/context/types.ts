import { types as espTypes } from "../../../common/middleware/espMiddleware";
import { types as commonTypes } from "../../../common/types/types";

export const types = {
  esp: espTypes,
  common: commonTypes,
  SET_ACCUMULATOR_LIST: "SET_ACCUMULATOR_LIST",
  ADD_TO_ACCUMULATOR_LIST: "ADD_TO_ACCUMULATOR_LIST",
  REMOVE_FROM_ACCUMULATOR_LIST: "REMOVE_FROM_ACCUMULATOR_LIST",
  TYPING_ACCUMULATOR: "TYPING_ACCUMULATOR"
};
