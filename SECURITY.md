# Security policy

This repository is a learning resource and demo application; it has no
production deployment or backend. All network traffic in the playground is
served by a mock Service Worker in the browser.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private
[security advisory form](https://github.com/aqkprogrammer/react-hooks-esp-middleware-example/security/advisories/new)
instead. Include the affected file or page, steps to reproduce and impact.
You should receive an acknowledgement within a week.

## Scope

- Bugs in hooks that could lead to XSS, data leakage or unsafe storage
  patterns when copied into an application.
- Vulnerable dependencies that affect the build or the hooks.

## Guidance included in the docs

- Never store tokens, secrets or personal data in `localStorage`,
  `sessionStorage` or JavaScript-readable cookies; authentication cookies
  should be `HttpOnly`, `Secure` and `SameSite`.
- The demo login accepts any credentials and returns a fake token — it is
  not an authentication implementation.
