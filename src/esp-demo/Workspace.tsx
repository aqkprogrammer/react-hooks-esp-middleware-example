import cn from 'classnames';
import type { FormEvent, ReactNode } from 'react';
import { resetForm } from './common/form';
import useFormField from './common/hooks/useFormField';
import { useWorkspace } from './context/context';
import { themes } from './context/types';
import './styles.css';

export function Workspace({ children }: { children: ReactNode }) {
  // useContext is like a dependency injector
  const { state, actions } = useWorkspace();
  const { forms } = state;
  const loginForm = {
    username: useFormField(forms.login.username.input, (value) => {
      actions.typing(value, 'username');
    }),
    password: useFormField(forms.login.password.input, (value) => {
      actions.typing(value, 'password');
    }),
  };
  const loginDisabled =
    loginForm.username.isEmpty || loginForm.password.isEmpty || state.loginStatus === 'pending';
  const loginFormError = forms.login.errors.length > 0;
  const usernameError = forms.login.username.errors.length > 0;
  const passwordError = forms.login.password.errors.length > 0;
  const workspaceClassName = cn('workspace', state.themeClassName);

  const onLoginRequest = (event: FormEvent) => {
    event.preventDefault();
    // Validation happens in middleware (formValidationMiddleware).
    actions.login(loginForm.username.value, loginForm.password.value);
    resetForm(loginForm);
  };

  const onLogoutRequest = () => {
    actions.logout();
    resetForm(loginForm);
  };

  return (
    <div className={workspaceClassName}>
      <h2 className="workspaceTitle">Fake Workspace &amp; functional-package combo</h2>
      <form className="workspaceForm" onSubmit={onLoginRequest} noValidate>
        <fieldset className="login">
          <legend>Login</legend>
          <p>
            Fake login that tiles react to. Any credentials work except the password{' '}
            <code>wrong</code> (mocked <code>/api/login</code>).
          </p>
          {!state.userToken && (
            <>
              <label className="visually-hidden" htmlFor="esp-username">
                Username
              </label>
              <input
                id="esp-username"
                className={cn({ inputError: usernameError })}
                name="usernameInput"
                placeholder="Any Username"
                autoComplete="username"
                aria-invalid={usernameError || undefined}
                aria-describedby={loginFormError ? 'esp-login-errors' : undefined}
                {...loginForm.username.bind}
              />
              <label className="visually-hidden" htmlFor="esp-password">
                Password
              </label>
              <input
                id="esp-password"
                className={cn({ inputError: passwordError })}
                name="passwordInput"
                placeholder="Any Password"
                type="password"
                autoComplete="current-password"
                aria-invalid={passwordError || undefined}
                aria-describedby={loginFormError ? 'esp-login-errors' : undefined}
                {...loginForm.password.bind}
              />
              <button type="submit" disabled={loginDisabled}>
                {state.loginStatus === 'pending' ? 'Logging in…' : 'Login'}
              </button>
              {loginFormError && (
                <ul className="errorList" id="esp-login-errors">
                  {forms.login.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
              {state.loginError && (
                <p className="errorList" role="alert">
                  {state.loginError}
                </p>
              )}
            </>
          )}
          {state.userToken && (
            <>
              <button type="button" onClick={onLogoutRequest}>
                Logout
              </button>
              <div className="userToken">UserToken: {state.userToken}</div>
            </>
          )}
        </fieldset>
        <fieldset className="theme">
          <legend>Theme</legend>
          {themes.map((theme) => (
            <button
              key={theme}
              className={theme}
              type="button"
              aria-pressed={state.themeClassName === theme}
              onClick={() => actions.setTheme(theme)}
            >
              {theme[0]!.toUpperCase() + theme.slice(1)}
            </button>
          ))}
        </fieldset>
      </form>
      <section className="workspaceTiles" aria-label="Tiles">
        {children}
      </section>
    </div>
  );
}
