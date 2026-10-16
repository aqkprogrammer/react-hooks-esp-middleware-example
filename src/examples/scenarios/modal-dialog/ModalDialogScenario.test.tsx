import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import { installDialogPolyfill } from '../../../test/installDialogPolyfill';
import ModalDialogScenario from './ModalDialogScenario';

let uninstall: () => void = () => {};
beforeEach(() => {
  uninstall = installDialogPolyfill();
});
afterEach(() => uninstall());

const editButton = () => screen.getByRole('button', { name: 'Edit profile' });
// Closed dialogs are display:none (no accessible name), so locate them by heading.
const dialogTitled = (title: string) => {
  const dialog = screen.getByText(title, { selector: 'h3' }).closest('dialog');
  if (!dialog) throw new Error(`No dialog titled ${title}`);
  return dialog;
};
const editor = () => dialogTitled('Edit profile');
const confirm = () => dialogTitled('Discard unsaved changes?');

async function openEditor() {
  const user = userEvent.setup();
  render(<ModalDialogScenario />);
  await user.click(editButton());
  return user;
}

describe('ModalDialogScenario', () => {
  it('opens modally, focuses the first field and locks page scroll', async () => {
    await openEditor();
    expect(editor()).toHaveAttribute('open');
    expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBe(editor());
    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('saves with returnValue "save", restores focus to the trigger and unlocks scroll', async () => {
    const user = await openEditor();
    const name = screen.getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Grace Hopper');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(editor()).not.toHaveAttribute('open');
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Last result: "save"')).toBeInTheDocument();
    expect(editButton()).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the dialog open and focuses the invalid field when validation fails', async () => {
    const user = await openEditor();
    await user.clear(screen.getByLabelText('Name'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(editor()).toHaveAttribute('open');
    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Enter a name.');
  });

  it('closes with Cancel or Escape when nothing changed and restores focus', async () => {
    const user = await openEditor();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(editor()).not.toHaveAttribute('open');
    expect(screen.getByText('Last result: "cancel"')).toBeInTheDocument();
    expect(editButton()).toHaveFocus();

    await user.click(editButton());
    await user.keyboard('{Escape}');
    expect(editor()).not.toHaveAttribute('open');
    expect(screen.getByText('Last result: "" (Escape)')).toBeInTheDocument();
    expect(editButton()).toHaveFocus();
  });

  it('asks before discarding changes; only the topmost dialog reacts to Escape', async () => {
    const user = await openEditor();
    const name = screen.getByLabelText('Name');
    await user.type(name, ' Byron');

    await user.keyboard('{Escape}');
    expect(confirm()).toHaveAttribute('open');
    expect(screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' })).toBe(confirm());
    expect(confirm()).toHaveAccessibleDescription('Your edits to the profile will be lost.');
    expect(editor()).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(confirm()).not.toHaveAttribute('open');
    expect(editor()).toHaveAttribute('open');
    expect(name).toHaveFocus();
    expect(name).toHaveValue('Ada Lovelace Byron');
  });

  it('returns to editing with "Keep editing" and discards with "Discard changes"', async () => {
    const user = await openEditor();
    await user.type(screen.getByLabelText('Name'), ' Byron');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(editor()).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(confirm()).not.toHaveAttribute('open');
    expect(editor()).not.toHaveAttribute('open');
    expect(screen.getByText('Last result: "discard"')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(editButton()).toHaveFocus();
    expect(
      screen.getByText(/confirm dialog closed with returnValue "discard"/),
    ).toBeInTheDocument();
  });

  it('has no detectable accessibility violations with the nested dialogs open', async () => {
    const user = await openEditor();
    await expectNoAxeViolations(document.body);
    await user.type(screen.getByLabelText('Email'), 'x');
    await user.keyboard('{Escape}');
    await expectNoAxeViolations(document.body);
  });
});
