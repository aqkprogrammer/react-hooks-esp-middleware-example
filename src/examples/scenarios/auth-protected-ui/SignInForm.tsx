import { Button } from '../../../components/ui';
import { HttpError, useForm, type FormRules } from '../../../hooks';
import { useAuth } from './authContext';

interface Credentials {
  username: string;
  password: string;
}

const rules: FormRules<Credentials> = {
  username: { validate: (value) => (value.trim() ? null : 'Enter your username.') },
  password: { validate: (value) => (value ? null : 'Enter your password.') },
};

function describeError(error: Error): string {
  if (error instanceof HttpError && error.status === 401) return 'Incorrect username or password.';
  return `Sign-in failed: ${error.message}`;
}

export function SignInForm() {
  const { signIn } = useAuth();
  const form = useForm<Credentials>({ initialValues: { username: '', password: '' }, rules });
  const { register, errors, getFieldIds, handleSubmit, isSubmitting, submitStatus, submitError } =
    form;
  const user = getFieldIds('username');
  const pass = getFieldIds('password');

  const onSubmit = handleSubmit(async (values, signal) => {
    await signIn(values.username.trim(), values.password, signal);
  });

  return (
    <form noValidate className="stack auth-form" onSubmit={(event) => void onSubmit(event)}>
      {submitStatus === 'error' && submitError ? (
        <p role="alert" className="callout callout-danger">
          {describeError(submitError)}
        </p>
      ) : null}
      <div className="field">
        <label htmlFor={user.id} className="field-label">
          Username
        </label>
        <input {...register('username')} className="input" autoComplete="username" />
        {errors.username ? (
          <p id={user.errorId} className="field-error">
            {errors.username}
          </p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor={pass.id} className="field-label">
          Password
        </label>
        <input
          {...register('password')}
          className="input"
          type="password"
          autoComplete="current-password"
        />
        {errors.password ? (
          <p id={pass.errorId} className="field-error">
            {errors.password}
          </p>
        ) : null}
      </div>
      <div>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>
      <p className="muted small">
        Any username works. Sign in as <strong>viewer</strong> for read-only access; the password{' '}
        <strong>wrong</strong> is rejected with 401.
      </p>
    </form>
  );
}
