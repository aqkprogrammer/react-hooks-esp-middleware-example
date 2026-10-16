import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../../test/server';
import UseDemo from './UseDemo';
import { clearProfileCache } from './api';
import { createGate, leaveActEnvironment } from './testUtils';

/** Holds every profile response until `gate.open()`; id 2 exists, others are 404. */
function holdProfiles() {
  const gate = createGate();
  server.use(
    http.get('/api/modern/profiles/:id', async ({ params }) => {
      await gate.promise;
      return Number(params.id) === 2
        ? HttpResponse.json({ id: 2, name: 'Grace Hopper', role: 'Admiral', bio: 'Compilers.' })
        : HttpResponse.json({ message: `Profile ${String(params.id)} not found` }, { status: 404 });
    }),
  );
  return gate;
}

const profileButton = (name: string) =>
  within(screen.getByRole('group', { name: 'Profiles' })).getByRole('button', { name });

describe('UseDemo', () => {
  afterEach(() => clearProfileCache());

  it('shows the Suspense fallback, then the profile, without a transition', async () => {
    const gate = holdProfiles();
    const user = userEvent.setup();
    render(<UseDemo />);
    await user.click(screen.getByLabelText(/Switch inside startTransition/));

    leaveActEnvironment();
    profileButton('Grace').click();
    expect(await screen.findByText('Loading profile…')).toBeInTheDocument();
    gate.open();
    expect(
      await screen.findByRole('article', { name: 'Grace Hopper profile' }),
    ).toBeInTheDocument();
  });

  it('keeps the previous content and shows isPending inside a transition', async () => {
    const gate = holdProfiles();
    render(<UseDemo />);
    leaveActEnvironment();
    profileButton('Grace').click();
    expect(await screen.findByText('Loading the next profile…')).toBeInTheDocument();
    expect(screen.getByText('Pick a profile above.')).toBeInTheDocument();
    expect(screen.queryByText('Loading profile…')).not.toBeInTheDocument();
    gate.open();
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('Loading the next profile…')).not.toBeInTheDocument();
  });

  it('reads context conditionally with use(Context)', async () => {
    server.use(
      http.get('/api/modern/profiles/:id', () =>
        HttpResponse.json({ id: 1, name: 'Ada Lovelace', role: 'Analyst', bio: 'Algorithms.' }),
      ),
    );
    render(<UseDemo />);
    leaveActEnvironment();
    profileButton('Ada').click();
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Theme context not read.')).toBeInTheDocument();

    screen.getByLabelText(/Conditionally read theme/).click();
    expect(await screen.findByText('Theme read from context: ocean')).toBeInTheDocument();
    const select = screen.getByLabelText<HTMLSelectElement>('Theme');
    select.value = 'sunset';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(await screen.findByText('Theme read from context: sunset')).toBeInTheDocument();
  });

  it('shows a rejected promise in the error boundary and retries with a new promise', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    holdProfiles().open();
    render(<UseDemo />);
    leaveActEnvironment();
    profileButton('Missing (404)').click();
    expect(await screen.findByText('Profile 4 not found')).toBeInTheDocument();

    server.use(
      http.get('/api/modern/profiles/:id', () =>
        HttpResponse.json({ id: 4, name: 'Recovered', role: 'Test', bio: 'Second attempt.' }),
      ),
    );
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(await screen.findByText('Recovered')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Profile 4 not found')).toBeNull());
    // React reports errors caught by an error boundary through console.error.
    expect(consoleError).toHaveBeenCalled();
  });
});
