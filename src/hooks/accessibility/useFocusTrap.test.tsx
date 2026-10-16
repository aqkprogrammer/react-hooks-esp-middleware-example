import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useFocusTrap, type UseFocusTrapOptions } from './useFocusTrap';

function Trap({
  children,
  options,
  label = 'Trap',
}: {
  children: ReactNode;
  options?: UseFocusTrapOptions;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, options);
  return (
    <div ref={ref} role="group" aria-label={label}>
      {children}
    </div>
  );
}

function Harness({ options }: { options?: UseFocusTrapOptions }) {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button">Outside</button>
      {open ? (
        <Trap options={options}>
          <button type="button">One</button>
          <button type="button" onClick={() => setExtra(true)}>
            Add
          </button>
          <button type="button" disabled>
            Disabled
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
          {extra ? <button type="button">Extra</button> : null}
        </Trap>
      ) : null}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the first tabbable element and cycles Tab / Shift+Tab inside', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Add' })).toHaveFocus();
    await user.tab(); // skips the disabled button
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab(); // wraps
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();
    await user.tab({ shift: true }); // wraps backwards
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('restores focus to the trigger when deactivated', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}'); // "Close"
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('handles content added while active', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab(); // the new last element is found on this key press
    expect(screen.getByRole('button', { name: 'Extra' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();
  });

  it('pulls focus back when it escapes', () => {
    render(<Harness />);
    act(() => screen.getByRole('button', { name: 'Open' }).click());
    const one = screen.getByRole('button', { name: 'One' });
    expect(one).toHaveFocus();
    act(() => screen.getByRole('button', { name: 'Outside' }).focus());
    expect(one).toHaveFocus();
  });

  it('focuses the container when nothing inside is tabbable, then removes the tabindex it added', async () => {
    const user = userEvent.setup();
    function Empty() {
      const [active, setActive] = useState(true);
      return (
        <div>
          <Trap options={{ active }}>
            <p>Read-only content</p>
          </Trap>
          <button type="button" onClick={() => setActive(false)}>
            Release
          </button>
        </div>
      );
    }
    render(<Empty />);
    const group = screen.getByRole('group');
    expect(group).toHaveFocus();
    expect(group).toHaveAttribute('tabindex', '-1');
    await user.tab();
    expect(group).toHaveFocus();
    act(() => screen.getByRole('button', { name: 'Release' }).click());
    expect(group).not.toHaveAttribute('tabindex');
  });

  it('supports initialFocus as a ref, "container" and false, and restoreFocus: false', async () => {
    const user = userEvent.setup();
    function WithRef() {
      const ref = useRef<HTMLButtonElement>(null);
      return (
        <Trap options={{ initialFocus: ref }}>
          <button type="button">First</button>
          <button type="button" ref={ref}>
            Primary
          </button>
        </Trap>
      );
    }
    const { unmount } = render(<WithRef />);
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveFocus();
    unmount();

    const container = render(
      <Trap options={{ initialFocus: 'container' }}>
        <button type="button">First</button>
      </Trap>,
    );
    expect(screen.getByRole('group')).toHaveFocus();
    container.unmount();

    render(<Harness options={{ initialFocus: false, restoreFocus: false }} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
    await user.tab(); // focus is outside the trap → Tab enters it
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Open' })).not.toHaveFocus();
  });

  it('only the most recently activated (innermost) trap handles Tab', async () => {
    const user = userEvent.setup();
    function Nested() {
      const [inner, setInner] = useState(false);
      return (
        <Trap label="Outer">
          <button type="button" onClick={() => setInner(true)}>
            Open inner
          </button>
          {inner ? (
            <Trap label="Inner">
              <button type="button">Inner A</button>
              <button type="button" onClick={() => setInner(false)}>
                Inner close
              </button>
            </Trap>
          ) : null}
          <button type="button">Outer last</button>
        </Trap>
      );
    }
    render(<Nested />);
    await user.click(screen.getByRole('button', { name: 'Open inner' }));
    expect(screen.getByRole('button', { name: 'Inner A' })).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Inner A' })).toHaveFocus();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Open inner' })).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Open inner' })).toHaveFocus();
  });
});
