import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test/installDialogPolyfill';
import { useDialogState, type UseDialogStateOptions } from './useDialogState';

let uninstall: () => void = () => {};
beforeEach(() => {
  uninstall = installDialogPolyfill();
});
afterEach(() => uninstall());

function ConfirmDelete(options: UseDialogStateOptions) {
  const dialog = useDialogState(options);
  return (
    <div>
      <button type="button" onClick={dialog.open}>
        Delete project
      </button>
      <p>open: {String(dialog.isOpen)}</p>
      <p>result: {dialog.returnValue ?? 'none'}</p>
      <dialog {...dialog.dialogProps}>
        <h2 id={dialog.titleId}>Delete this project?</h2>
        <form method="dialog">
          <button value="cancel">Cancel</button>
          <button type="button" onClick={() => dialog.close('confirm')}>
            Delete
          </button>
        </form>
      </dialog>
    </div>
  );
}

describe('useDialogState', () => {
  it('opens modally, is labelled by its title and moves focus inside', async () => {
    const user = userEvent.setup();
    render(<ConfirmDelete />);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this project?' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('open: true')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('syncs state and restores focus when closed with a return value', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ConfirmDelete onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('open: false')).toBeInTheDocument();
    expect(screen.getByText('result: confirm')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledWith('confirm');
    expect(screen.getByRole('button', { name: 'Delete project' })).toHaveFocus();
  });

  it('clears the previous returnValue when reopened, so Escape reports an empty value', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ConfirmDelete onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onClose).toHaveBeenLastCalledWith('confirm');

    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenLastCalledWith('');
  });

  it('syncs when the browser closes it via Escape (cancel event)', async () => {
    const user = userEvent.setup();
    render(<ConfirmDelete />);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    await user.keyboard('{Escape}');
    expect(screen.getByText('open: false')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete project' })).toHaveFocus();
  });

  it('can refuse Escape with closeOnEscape: false', async () => {
    const user = userEvent.setup();
    render(<ConfirmDelete closeOnEscape={false} />);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    await user.keyboard('{Escape}');
    expect(screen.getByText('open: true')).toBeInTheDocument();
  });

  it('closes on backdrop clicks only when enabled and only outside the box', async () => {
    const user = userEvent.setup();
    render(<ConfirmDelete closeOnBackdropClick />);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 100, y: 100, width: 300, height: 200 }),
    );
    fireEvent.click(dialog, { clientX: 150, clientY: 150 }); // padding inside the box
    expect(screen.getByText('open: true')).toBeInTheDocument();
    fireEvent.click(dialog, { clientX: 10, clientY: 10 }); // ::backdrop
    expect(screen.getByText('open: false')).toBeInTheDocument();
  });

  it('opens on mount with defaultOpen', () => {
    render(<ConfirmDelete defaultOpen />);
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(screen.getByText('open: true')).toBeInTheDocument();
  });

  it('restores focus when the component unmounts while open', async () => {
    const user = userEvent.setup();
    function Settings({ onDiscard }: { onDiscard: () => void }) {
      const dialog = useDialogState({ defaultOpen: true });
      return (
        <dialog {...dialog.dialogProps}>
          <h2 id={dialog.titleId}>Settings</h2>
          <button type="button" onClick={onDiscard}>
            Discard
          </button>
        </dialog>
      );
    }
    function Host() {
      const [mounted, setMounted] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setMounted(true)}>
            Open settings
          </button>
          {mounted ? <Settings onDiscard={() => setMounted(false)} /> : null}
        </div>
      );
    }
    render(<Host />);
    await user.click(screen.getByRole('button', { name: 'Open settings' }));
    expect(screen.getByRole('button', { name: 'Discard' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
  });

  it('falls back to the open attribute without showModal support', async () => {
    uninstall();
    const user = userEvent.setup();
    render(<ConfirmDelete />);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('open');
    await user.click(screen.getByRole('button', { name: 'Delete', hidden: true }));
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');
    expect(screen.getByText('result: confirm')).toBeInTheDocument();
  });
});
