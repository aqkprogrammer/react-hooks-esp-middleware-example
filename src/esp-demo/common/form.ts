/** Resets every field of a form built from `useFormField` results. */
export const resetForm = (form: Record<string, { reset: () => void }>) =>
  Object.values(form).forEach(({ reset }) => reset());
