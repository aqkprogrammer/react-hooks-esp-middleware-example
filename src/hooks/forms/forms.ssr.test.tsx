// Runs in the "ssr" Vitest project (Node, no DOM): the form hooks must render
// on the server without touching browser globals.
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useField } from './useField';
import { useFieldArray } from './useFieldArray';
import { useForm } from './useForm';
import { useFormDirtyState } from './useFormDirtyState';
import { useFormSubmission } from './useFormSubmission';
import { useFormValidation } from './useFormValidation';
import { useInput } from './useInput';
import { useMultiStepForm } from './useMultiStepForm';

function Everything() {
  const input = useInput('hi');
  const field = useField({ id: 'nick', initialValue: 'ada' });
  const form = useForm({
    id: 'f',
    initialValues: { email: 'a@b.c', terms: true },
    warnOnUnsavedChanges: true,
  });
  useFormValidation({});
  useFormDirtyState({ a: 1 }, { a: 2 }, { warnOnUnload: true });
  useFormSubmission(async () => 'ok');
  const rows = useFieldArray(['one']);
  const wizard = useMultiStepForm({ steps: [{ id: 'a', title: 'A' }] });
  return (
    <form>
      <input aria-label="plain" {...input.bind} />
      <input aria-label="nick" {...field.inputProps} />
      <input aria-label="email" {...form.register('email')} />
      <input aria-label="terms" type="checkbox" {...form.register('terms')} />
      <p>
        {rows.values.join(',')}|{wizard.currentStep.title}
      </p>
    </form>
  );
}

describe('form hooks on the server', () => {
  it('render initial values without window or document', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToString(<Everything />);
    expect(html).toContain('value="hi"');
    expect(html).toContain('id="nick" value="ada"');
    expect(html).toContain('id="f-email"');
    expect(html).toContain('checked=""');
    expect(html).toContain('one<!-- -->|<!-- -->A');
  });
});
