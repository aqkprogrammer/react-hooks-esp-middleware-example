import { types as espTypes } from "../common/middleware/espMiddleware";
import { types as validationTypes } from "../common/middleware/formValidationMiddleware";
import { types as commonTypes } from "../common/types/types";
import { types as authTypes } from "./middleware/loginMiddleware";

export const types = {
  auth: authTypes,
  esp: espTypes,
  common: commonTypes,
  validation: validationTypes,
  SET_THEME_ACTION: "SET_THEME_ACTION",
  TRIGGER_ACTION: "TRIGGER_ACTION", // generic, see ./actions.ts
  /**
   * How scalable are these typing types... would need one for every field?
   */
  TYPING_USERNAME: "TYPING_USERNAME",
  TYPING_PASSWORD: "TYPING_PASSWORD",
  // Instead just have one with a form field key?
  TYPING: "TYPING"
};
