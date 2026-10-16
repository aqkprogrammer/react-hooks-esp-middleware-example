import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { handlers as formHandlers } from '../../../mocks/extra/forms';
import { server } from '../../../test/server';
import UseMultiStepFormDemo from './UseMultiStepFormDemo';

beforeEach(() => server.use(...formHandlers));

describe('UseMultiStepFormDemo', () => {
  it('validates each step, moves focus to the new step and submits at the end', async () => {
    const user = userEvent.setup();
    render(<UseMultiStepFormDemo />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Username'), 'wizard_1');
    await user.type(screen.getByLabelText('Email'), 'wiz@example.com');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Profile' })).toHaveFocus();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();

    // Going back keeps the values; the step list allows jumping to visited steps.
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Username')).toHaveValue('wizard_1');
    expect(screen.getByRole('button', { name: '3. Review' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '2. Profile' }));

    await user.type(screen.getByLabelText('Display name'), 'Wiz');
    await user.selectOptions(screen.getByLabelText('Role'), 'designer');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Review' })).toHaveFocus();
    expect(screen.getByText('Designer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3. Review' })).toHaveAttribute(
      'aria-current',
      'step',
    );

    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Please confirm the details')).toBeInTheDocument();
    await user.click(screen.getByLabelText('These details are correct'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText(/Account “wizard_1” created/, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start again' }));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveValue('');
  });
});
