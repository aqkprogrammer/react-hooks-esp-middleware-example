import { render, screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import { server } from '../../../test/server';
import MultiStepFormScenario from './MultiStepFormScenario';
import { DRAFT_KEY } from './wizardModel';

const heading = (name: RegExp) => screen.getByRole('heading', { level: 3, name });

async function fillAccount(user: UserEvent, email = 'ada@example.com') {
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), 'lovelace1');
  await user.type(screen.getByLabelText('Confirm password'), 'lovelace1');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(heading(/Step 2 of 3: Profile/)).toHaveFocus());
}

async function fillProfile(user: UserEvent, name = 'Ada') {
  await user.type(screen.getByLabelText('Display name'), name);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(heading(/Step 3 of 3: Review/)).toHaveFocus());
}

function readDraft(): unknown {
  const raw = window.sessionStorage.getItem(DRAFT_KEY);
  return raw === null ? null : JSON.parse(raw);
}

describe('MultiStepFormScenario', () => {
  it('validates the current step and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    render(<MultiStepFormScenario />);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Enter your email address.');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 8 characters, including a number. Choose a password.',
    );
    expect(heading(/Step 1 of 3: Account/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'other');
    await user.tab();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByText('The passwords do not match.')).toBeInTheDocument();
  });

  it('moves focus to the new step heading, keeps values when going back, and tracks progress', async () => {
    const user = userEvent.setup();
    render(<MultiStepFormScenario />);
    await fillAccount(user);
    expect(screen.getByRole('progressbar', { name: 'Step 2 of 3' })).toHaveAttribute('value', '2');
    const nav = screen.getByRole('navigation', { name: 'Sign-up progress' });
    expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent('2. Profile');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(heading(/Step 1 of 3: Account/)).toHaveFocus());
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');

    // Visited steps can be revisited from the step list.
    await user.click(screen.getByRole('button', { name: '2. Profile' }));
    await waitFor(() => expect(heading(/Step 2 of 3: Profile/)).toHaveFocus());
  });

  it('submits on Enter from a field (Enter = Next)', async () => {
    const user = userEvent.setup();
    render(<MultiStepFormScenario />);
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'lovelace1');
    await user.type(screen.getByLabelText('Confirm password'), 'lovelace1{Enter}');
    await waitFor(() => expect(heading(/Step 2 of 3: Profile/)).toHaveFocus());
  });

  it('persists a draft without passwords and restores it on reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<MultiStepFormScenario />);
    await fillAccount(user);
    await user.type(screen.getByLabelText('Display name'), 'Ada');

    expect(readDraft()).toEqual({
      step: 1,
      values: {
        email: 'ada@example.com',
        displayName: 'Ada',
        bio: '',
        newsletter: false,
        acceptTerms: false,
      },
    });
    expect(window.sessionStorage.getItem(DRAFT_KEY)).not.toContain('lovelace1');

    unmount();
    render(<MultiStepFormScenario />);
    expect(screen.getByText('Draft restored')).toBeInTheDocument();
    expect(heading(/Step 2 of 3: Profile/)).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toHaveValue('Ada');
  });

  it('sends a restored draft back to the step with missing passwords on submit', async () => {
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        step: 2,
        values: {
          email: 'ada@example.com',
          displayName: 'Ada',
          bio: '',
          newsletter: true,
          acceptTerms: true,
        },
      }),
    );
    const user = userEvent.setup();
    render(<MultiStepFormScenario />);
    expect(heading(/Step 3 of 3: Review/)).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const password = await screen.findByLabelText('Password');
    await waitFor(() => expect(password).toHaveFocus());
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Choose a password.')).toBeInTheDocument();
  });

  it('ignores a corrupt draft', () => {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step: 'two', values: 42 }));
    render(<MultiStepFormScenario />);
    expect(screen.queryByText('Draft restored')).not.toBeInTheDocument();
    expect(heading(/Step 1 of 3/)).toBeInTheDocument();
  });

  it('creates the account, focuses the result and clears the draft', async () => {
    const user = userEvent.setup();
    render(<MultiStepFormScenario />);
    await fillAccount(user);
    await fillProfile(user);
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Accept the terms to create your account.')).toBeVisible();
    await user.click(screen.getByLabelText('I accept the terms of service'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const result = await screen.findByRole('heading', { name: 'Account created' });
    await waitFor(() => expect(result).toHaveFocus());
    expect(screen.getByText(/Account #\d+ was created for ada@example.com/)).toBeInTheDocument();
    expect(readDraft()).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Create another account' }));
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('maps a 409 to the email field on the first step', async () => {
    const user = userEvent.setup();
    render(<MultiStepFormScenario />);
    await fillAccount(user, 'taken@example.com');
    await fillProfile(user);
    await user.click(screen.getByLabelText('I accept the terms of service'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const email = await screen.findByLabelText('Email', {}, { timeout: 2000 });
    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAccessibleDescription('taken@example.com is already registered');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not create the account');
  });

  it('shows a server error and lets the user retry', async () => {
    let fail = true;
    server.use(
      http.post('/api/scenarios/wizard/accounts', () =>
        fail
          ? HttpResponse.json({ message: 'The account service is unavailable' }, { status: 500 })
          : HttpResponse.json(
              { id: 7, email: 'ada@example.com', displayName: 'Ada' },
              { status: 201 },
            ),
      ),
    );
    const user = userEvent.setup();
    render(<MultiStepFormScenario />);
    await fillAccount(user);
    await fillProfile(user);
    await user.click(screen.getByLabelText('I accept the terms of service'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The account service is unavailable',
    );
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/Account #7 was created/)).toBeInTheDocument();
  });

  it('warns before unload only while the form has input', async () => {
    const user = userEvent.setup();
    render(<MultiStepFormScenario />);
    const fire = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(fire()).toBe(false);
    await user.type(screen.getByLabelText('Email'), 'a');
    expect(fire()).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(fire()).toBe(false);
  });

  it('has no detectable accessibility violations with errors shown', async () => {
    const user = userEvent.setup();
    const { container } = render(<MultiStepFormScenario />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus());
    await expectNoAxeViolations(container);
  });
});
