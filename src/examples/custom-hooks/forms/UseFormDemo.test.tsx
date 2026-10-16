import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import { handlers as formHandlers } from '../../../mocks/extra/forms';

import { expectNoAxeViolations } from '../../../hooks/accessibility/testing/expectNoAxeViolations';
import UseFormDemo from './UseFormDemo';

async function fill(user: ReturnType<typeof userEvent.setup>, username: string) {
  await user.type(screen.getByLabelText('Username'), username);
  await user.type(screen.getByLabelText('Email'), 'new@example.com');
  await user.type(screen.getByLabelText('Password'), 'long enough');
  await user.type(screen.getByLabelText('Confirm password'), 'long enough');
  await user.click(screen.getByLabelText('I accept the terms of service'));
}

// Register the feature handlers explicitly so the test does not depend on the
// import.meta.glob in src/mocks/handlers.ts being fresh.
beforeEach(() => server.use(...formHandlers));

describe('UseFormDemo', () => {
  it('blocks an empty submit, shows errors and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    render(<UseFormDemo />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByLabelText('Username')).toHaveFocus();
    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('Username is required');
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Please accept the terms to continue')).toBeInTheDocument();
  });

  it('checks username availability on blur', async () => {
    const user = userEvent.setup();
    render(<UseFormDemo />);
    await user.type(screen.getByLabelText('Username'), 'ada');
    await user.tab();
    expect(await screen.findByText('“ada” is already taken')).toBeInTheDocument();
  });

  it('re-validates the confirmation when the password changes', async () => {
    const user = userEvent.setup();
    render(<UseFormDemo />);
    await user.type(screen.getByLabelText('Password'), 'long enough');
    await user.type(screen.getByLabelText('Confirm password'), 'long enough');
    await user.tab();
    await user.type(screen.getByLabelText('Password'), '!');
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('creates the account', async () => {
    const user = userEvent.setup();
    render(<UseFormDemo />);
    await fill(user, 'newuser1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText(/Welcome, newuser1!/, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create another account' }));
    expect(screen.getByLabelText('Username')).toHaveValue('');
  });

  it('maps a server-side field error onto the field and focuses it', async () => {
    const user = userEvent.setup();
    render(<UseFormDemo />);
    await fill(user, 'racer');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText('Please choose another username.', undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('"racer" was registered a moment ago')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveFocus();
  });

  it('has no detectable accessibility violations, including with errors shown', async () => {
    const user = userEvent.setup();
    const { container } = render(<UseFormDemo />);
    await expectNoAxeViolations(container);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await expectNoAxeViolations(container);
  });
});
