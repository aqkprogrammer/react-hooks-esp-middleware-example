import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import { installDialogPolyfill } from '../../../test/installDialogPolyfill';
import UseDialogStateDemo from './UseDialogStateDemo';

let uninstall: () => void = () => {};
beforeEach(() => {
  uninstall = installDialogPolyfill();
});
afterEach(() => uninstall());

describe('UseDialogStateDemo', () => {
  it('confirms a deletion through <form method="dialog"> and restores focus', async () => {
    const user = userEvent.setup();
    render(<UseDialogStateDemo />);
    const deleteButton = screen.getByRole('button', { name: 'Delete Mobile app' });
    await user.click(deleteButton);
    const dialog = screen.getByRole('dialog', { name: 'Delete “Mobile app”?' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    expect(screen.queryByText('Mobile app')).not.toBeInTheDocument();
    expect(screen.getByText(/deleted “Mobile app”/)).toBeInTheDocument();
    expect(screen.getByText(/last returnValue: "delete"/)).toBeInTheDocument();
  });

  it('cancels with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<UseDialogStateDemo />);
    const deleteButton = screen.getByRole('button', { name: 'Delete Docs site' });
    await user.click(deleteButton);
    await user.keyboard('{Escape}');
    expect(screen.getByText(/Dialog state: closed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Docs site' })).toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });

  it('can ignore Escape', async () => {
    const user = userEvent.setup();
    render(<UseDialogStateDemo />);
    await user.click(screen.getByLabelText('Escape cancels'));
    await user.click(screen.getByRole('button', { name: 'Delete Docs site' }));
    await user.keyboard('{Escape}');
    expect(screen.getByText(/Dialog state: open/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText(/last returnValue: "cancel"/)).toBeInTheDocument();
  });

  it('has no detectable accessibility violations while open', async () => {
    const user = userEvent.setup();
    const { container } = render(<UseDialogStateDemo />);
    await user.click(screen.getByRole('button', { name: 'Delete Website redesign' }));
    await expectNoAxeViolations(container);
  });
});
