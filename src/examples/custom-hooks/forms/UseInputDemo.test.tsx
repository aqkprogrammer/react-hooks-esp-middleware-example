import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../hooks/accessibility/testing/expectNoAxeViolations';
import UseInputDemo from './UseInputDemo';

describe('UseInputDemo', () => {
  it('binds inputs, transforms the phone and resets everything', async () => {
    const user = userEvent.setup();
    render(<UseInputDemo />);
    await user.type(screen.getByLabelText('Name'), 'Grace');
    expect(screen.getByText('Hello, Grace!')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Phone'), '(555) 12-34');
    expect(screen.getByLabelText('Phone')).toHaveValue('5551234');

    await user.selectOptions(screen.getByLabelText('Plan'), 'team');
    expect(screen.getByText('"team"')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fill name (setValue)' }));
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace');

    await user.click(screen.getByRole('button', { name: 'Reset all' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Phone')).toHaveValue('');
    expect(screen.getByLabelText('Plan')).toHaveValue('free');
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<UseInputDemo />);
    await expectNoAxeViolations(container);
  });
});
