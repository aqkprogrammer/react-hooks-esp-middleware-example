export const resetForm = form =>
  Object.values(form).forEach(({ reset }) => reset());

/**
 * Not using this since I created the formValidationMiddleware
 */
export const validateForm = form => {
  let isValid = true;
  Object.values(form).forEach(({ isEmpty, validate }) => {
    validate();
    if (isEmpty) {
      isValid = false;
    }
  });
  return isValid;
};
