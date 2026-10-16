import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import { resetScenariosInteractionMocks } from '../../../mocks/extra/scenariosInteraction';
import { server } from '../../../test/server';
import AuthProtectedUiScenario from './AuthProtectedUiScenario';

afterEach(() => resetScenariosInteractionMocks());

async function signIn(user: UserEvent, username: string, password = 'secret') {
  await user.type(screen.getByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

const notesList = () => screen.findByRole('list', { name: 'Team notes' });

describe('AuthProtectedUiScenario', () => {
  it('shows a sign-in prompt instead of protected content when signed out', async () => {
    const user = userEvent.setup();
    render(<AuthProtectedUiScenario />);
    expect(screen.queryByRole('list', { name: 'Team notes' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in to view notes' }));
    expect(screen.getByLabelText('Username')).toHaveFocus();
  });

  it('validates the form and reports a 401 without signing in', async () => {
    const user = userEvent.setup();
    render(<AuthProtectedUiScenario />);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByLabelText('Username')).toHaveFocus();
    expect(screen.getByText('Enter your username.')).toBeInTheDocument();

    await signIn(user, 'ada', 'wrong');
    // (The announcer's empty live region also has role="alert"; match by text.)
    expect(await screen.findByText('Incorrect username or password.')).toHaveAttribute(
      'role',
      'alert',
    );
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('signs in, loads the role from /api/me and sends the bearer token', async () => {
    const authHeaders: Array<string | null> = [];
    server.use(
      http.get('/api/scenarios/auth/notes', ({ request }) => {
        authHeaders.push(request.headers.get('authorization'));
        return undefined; // fall through to the real mock
      }),
    );
    const user = userEvent.setup();
    render(<AuthProtectedUiScenario />);
    await signIn(user, 'ada');

    const heading = await screen.findByRole('heading', { name: 'Signed in as ada' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(await within(await notesList()).findByText(/Rotate the staging API keys/)).toBeVisible();
    expect(authHeaders).toEqual(['Bearer demo-token-ada']);
  });

  it('never persists the token in storage', async () => {
    const user = userEvent.setup();
    render(<AuthProtectedUiScenario />);
    await signIn(user, 'ada');
    await screen.findByRole('heading', { name: 'Signed in as ada' });
    const stored =
      JSON.stringify({ ...window.localStorage }) + JSON.stringify({ ...window.sessionStorage });
    expect(stored).not.toContain('demo-token');
    expect(document.cookie).not.toContain('demo-token');
  });

  it('lets editors add notes', async () => {
    const user = userEvent.setup();
    render(<AuthProtectedUiScenario />);
    await signIn(user, 'ada');
    await within(await notesList()).findByText(/Rotate the staging API keys/);
    await user.type(screen.getByLabelText('New note'), 'Ship it');
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    expect(await within(await notesList()).findByText('Ship it')).toBeInTheDocument();
    expect(screen.getByLabelText('New note')).toHaveValue('');
  });

  it('hides the editor for viewers, and the server rejects the request anyway', async () => {
    const user = userEvent.setup();
    render(<AuthProtectedUiScenario />);
    await signIn(user, 'viewer');
    await screen.findByRole('heading', { name: 'Signed in as viewer' });
    expect(screen.getByText('viewer', { selector: '.badge' })).toBeInTheDocument();
    await within(await notesList()).findByText(/Rotate the staging API keys/);
    expect(screen.queryByLabelText('New note')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try to add a note anyway' }));
    expect(
      await screen.findByText('The server refused: HTTP 403: Role "viewer" may not create notes'),
    ).toHaveAttribute('role', 'alert');
  });

  it('signs out and moves focus to the sign-in heading', async () => {
    const user = userEvent.setup();
    render(<AuthProtectedUiScenario />);
    await signIn(user, 'ada');
    await screen.findByRole('heading', { name: 'Signed in as ada' });
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in' })).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Sign in to view notes' })).toBeInTheDocument();
  });

  it('handles a session that expires on the server', async () => {
    const user = userEvent.setup();
    render(<AuthProtectedUiScenario />);
    await signIn(user, 'ada');
    await within(await notesList()).findByText(/Rotate the staging API keys/);

    await user.click(screen.getByRole('button', { name: 'Expire session on the server' }));
    expect(await screen.findByText(/The server revoked your token/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh notes' }));

    const heading = await screen.findByRole('heading', { name: 'Sign in' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText('Your session expired. Sign in again to continue.')).toBeVisible();
    await waitFor(() =>
      expect(document.querySelector('[data-live-announcer="assertive"]')).toHaveTextContent(
        'Your session expired.',
      ),
    );

    // Signing in again starts a fresh session.
    await signIn(user, 'ada');
    expect(await within(await notesList()).findByText(/Rotate the staging API keys/)).toBeVisible();
  });

  it('has no detectable accessibility violations signed out and signed in', async () => {
    const user = userEvent.setup();
    const { container } = render(<AuthProtectedUiScenario />);
    await expectNoAxeViolations(container);
    await signIn(user, 'ada');
    await within(await notesList()).findByText(/Rotate the staging API keys/);
    await expectNoAxeViolations(container);
  });
});
