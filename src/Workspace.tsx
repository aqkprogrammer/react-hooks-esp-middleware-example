import * as React from "react";
import { useContext } from "react";
import cn from "classnames";
import { WorkspaceContext } from "./context/context";
import { types } from "./context/types";
import useFormField from "./common/hooks/useFormField";
import { resetForm, validateForm } from "./common/form";
import "./styles.css";

export function Workspace({ children }) {
  // useContext is like a dependency injector
  const { state, actions } = useContext(WorkspaceContext);
  const { forms } = state;
  const loginForm = {
    username: useFormField(forms.login.username.input, value => {
      // actions.typingUsername(value);
      actions.typing(value, "username", "login");
    }),
    password: useFormField(forms.login.password.input, value => {
      // actions.typingPassword(value);
      actions.typing(value, "password", "login");
    })
  };
  const loginDisabled =
    loginForm.username.isEmpty || loginForm.password.isEmpty;
  const loginFormError = forms.login.errors.length > 0;
  const usernameError = forms.login.username.errors.length > 0;
  const passwordError = forms.login.password.errors.length > 0;
  const workspaceClassName = cn("workspace", state.themeClassName);
  const usernameInputClassName = cn({ inputError: usernameError });
  const passwordInputClassName = cn({ inputError: passwordError });

  const onLoginRequest = event => {
    event.preventDefault();
    // Created middleware for this now...
    // if (!validateForm(loginForm)) {
    //   console.warn("Form invalid");
    //   return;
    // }
    actions.triggerAction(
      {
        username: loginForm.username.value,
        password: loginForm.password.value
      },
      types.auth.LOGIN_REQUEST_ACTION
    );
    resetForm(loginForm);
  };

  const onLogoutRequest = event => {
    event.preventDefault();
    actions.triggerAction(null, types.auth.LOGOUT_REQUEST_ACTION);
    resetForm(loginForm);
  };

  return (
    <div className={workspaceClassName}>
      <h1>Fake Workspace & dtp-client-functional-package combo</h1>
      <form className="workspaceForm">
        <fieldset className="login">
          <p>Fake login in which a tile may want to react to.</p>
          {!state.userToken && (
            <>
              <input
                className={usernameInputClassName}
                name="usernameInput"
                placeholder="Any Username"
                title={forms.login.username.errors.join(", ")}
                {...loginForm.username.bind}
              />
              <input
                className={passwordInputClassName}
                name="passwordInput"
                placeholder="Any Password"
                type="password"
                title={forms.login.password.errors.join(", ")}
                {...loginForm.password.bind}
              />
              <button
                type="submit"
                disabled={loginDisabled}
                onClick={onLoginRequest}
              >
                Login
              </button>
              {loginFormError && (
                <ul className="errorList">
                  {forms.login.errors.map((error: string) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
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
          <span>Theme:</span>
          <button
            className="internal"
            type="button"
            onClick={() => actions.setTheme("internal")}
          >
            Internal
          </button>
          <button
            className="external"
            type="button"
            onClick={() => actions.setTheme("external")}
          >
            External
          </button>
          <button
            className="badger"
            type="button"
            onClick={() => actions.setTheme("badger")}
          >
            Badger
          </button>
        </fieldset>
      </form>
      <section className="workspaceTiles">{children}</section>
    </div>
  );
}
