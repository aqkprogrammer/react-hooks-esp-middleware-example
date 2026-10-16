import { useId, useState } from 'react';
import { Button, Callout, Panel, ValueTable } from '../../../components/ui';
import { useForm, type FormRules } from '../../../hooks';
import { FormRow } from './FormRow';
import {
  ApiError,
  checkUsernameAvailable,
  emailFormat,
  minLength,
  postJson,
  required,
  usernameFormat,
} from './formsApi';

interface SignUpValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

const initialValues: SignUpValues = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  terms: false,
};

const rules: FormRules<SignUpValues> = {
  username: {
    validate: [required('Username'), usernameFormat],
    validateAsync: (value, _values, signal) => checkUsernameAvailable(value, signal),
    asyncDebounceMs: 400,
  },
  email: { validate: [required('Email'), emailFormat] },
  password: { validate: [required('Password'), minLength(8)], deps: ['confirmPassword'] },
  confirmPassword: {
    validate: (value, values) => (value === values.password ? undefined : 'Passwords do not match'),
  },
  terms: { validate: (value) => (value ? undefined : 'Please accept the terms to continue') },
};

/**
 * A sign-up form with sync rules, an async "username available" check,
 * a cross-field rule, server-side errors and accessible error handling.
 */
export default function UseFormDemo() {
  const [account, setAccount] = useState<{ id: number; username: string } | null>(null);
  const form = useForm<SignUpValues>({ initialValues, rules });
  const requiredNoteId = useId();
  const { errors } = form;

  const onSubmit = form.handleSubmit(async (values, signal) => {
    try {
      const created = await postJson<{ id: number; username: string }>(
        '/api/forms/signup',
        { username: values.username, email: values.email },
        signal,
      );
      setAccount(created);
    } catch (error) {
      // A field-level server error: show it on the field and move focus there.
      if (error instanceof ApiError && error.field === 'username') {
        form.setFieldError('username', error.message);
        form.focusField('username');
        throw new Error('Please choose another username.');
      }
      throw error;
    }
  });

  if (account) {
    return (
      <div className="stack">
        <Callout tone="success" title="Account created">
          Welcome, {account.username}! (account #{account.id})
        </Callout>
        <div className="row">
          <Button
            onClick={() => {
              setAccount(null);
              form.reset();
            }}
          >
            Create another account
          </Button>
        </div>
      </div>
    );
  }

  const termsIds = form.getFieldIds('terms');
  return (
    <div className="stack">
      <Panel
        title="Sign up"
        description="Taken usernames: ada, admin, grace… “racer” passes the check but is taken on submit."
      >
        <form className="stack" noValidate onSubmit={onSubmit} aria-describedby={requiredNoteId}>
          <p id={requiredNoteId} className="muted small">
            All fields are required.
          </p>
          <FormRow
            label="Username"
            field={form.register('username')}
            error={errors.username}
            autoComplete="username"
            required
            status={form.validating.username ? 'Checking availability…' : undefined}
          />
          <FormRow
            label="Email"
            type="email"
            field={form.register('email')}
            error={errors.email}
            autoComplete="email"
            required
          />
          <FormRow
            label="Password"
            type="password"
            field={form.register('password')}
            error={errors.password}
            hint="At least 8 characters."
            autoComplete="new-password"
            required
          />
          <FormRow
            label="Confirm password"
            type="password"
            field={form.register('confirmPassword')}
            error={errors.confirmPassword}
            autoComplete="new-password"
            required
          />
          <div className="field">
            <label className="row">
              <input type="checkbox" required {...form.register('terms')} />
              <span>I accept the terms of service</span>
            </label>
            {errors.terms ? (
              <p id={termsIds.errorId} className="field-error">
                {errors.terms}
              </p>
            ) : null}
          </div>
          <div className="row">
            <Button type="submit" variant="primary" aria-disabled={form.isSubmitting || undefined}>
              {form.isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
            <Button variant="ghost" onClick={() => form.reset()}>
              Reset
            </Button>
          </div>
          <div role="alert">
            {form.submitError ? <p className="field-error">{form.submitError.message}</p> : null}
          </div>
        </form>
      </Panel>
      <Panel title="Form state">
        <ValueTable
          label="Form state"
          rows={{
            isDirty: String(form.isDirty),
            isValid: String(form.isValid),
            isValidating: String(form.isValidating),
            isSubmitting: String(form.isSubmitting),
            submitStatus: form.submitStatus,
            submitCount: form.submitCount,
            'fields with errors': Object.keys(errors).join(', ') || '—',
          }}
        />
      </Panel>
    </div>
  );
}
