import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import { handlers as formHandlers } from '../../../mocks/extra/forms';

import UseFormValidationDemo from './UseFormValidationDemo';

// Register the feature handlers explicitly so the test does not depend on the
// import.meta.glob in src/mocks/handlers.ts being fresh.
beforeEach(() => server.use(...formHandlers));

describe('UseFormValidationDemo', () => {
  it('reports taken usernames from the async check', async () => {
    const user = userEvent.setup();
    render(<UseFormValidationDemo />);
    await user.type(screen.getByLabelText('Username'), 'ada');
    expect(screen.getByText('Checking availability…')).toBeInTheDocument();
    expect(await screen.findByText('“ada” is already taken')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
  });

  it('aborts the superseded check and keeps the newest answer', async () => {
    const user = userEvent.setup();
    render(<UseFormValidationDemo />);
    // "ada" (taken, slower) is superseded by "adal" (available, faster).
    await user.type(screen.getByLabelText('Username'), 'adal');
    expect(await screen.findByText('“adal” is available')).toBeInTheDocument();
    const log = screen.getByRole('log', { name: 'Network log' });
    expect(within(log).getByText(/aborted "ada" \(superseded\)/)).toBeInTheDocument();
    expect(within(log).queryByText(/response "ada":/)).not.toBeInTheDocument();
  });

  it('runs the sync rule first without sending a request', async () => {
    const user = userEvent.setup();
    render(<UseFormValidationDemo />);
    await user.type(screen.getByLabelText('Username'), 'a!');
    expect(screen.getByText('Use 3–20 letters, digits or underscores')).toBeInTheDocument();
    expect(screen.getByText('Nothing logged yet.')).toBeInTheDocument();
  });
});
