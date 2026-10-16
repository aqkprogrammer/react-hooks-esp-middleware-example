import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useEscapeKey } from './useEscapeKey';

function Layer({ name, onEscape }: { name: string; onEscape: () => void }) {
  useEscapeKey(onEscape);
  return <p>{name} open</p>;
}

function Stack() {
  const [drawer, setDrawer] = useState(false);
  const [popover, setPopover] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setDrawer(true)}>
        Open drawer
      </button>
      {drawer ? (
        <>
          <Layer name="Drawer" onEscape={() => setDrawer(false)} />
          <button type="button" onClick={() => setPopover(true)}>
            Open popover
          </button>
          <label>
            Filter <input />
          </label>
        </>
      ) : null}
      {drawer && popover ? <Layer name="Popover" onEscape={() => setPopover(false)} /> : null}
    </div>
  );
}

describe('useEscapeKey', () => {
  it('closes only the topmost layer per Escape press', async () => {
    const user = userEvent.setup();
    render(<Stack />);
    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    await user.click(screen.getByRole('button', { name: 'Open popover' }));
    expect(screen.getByText('Popover open')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('Popover open')).not.toBeInTheDocument();
    expect(screen.getByText('Drawer open')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('Drawer open')).not.toBeInTheDocument();
  });

  it('still works while typing in an input', async () => {
    const user = userEvent.setup();
    render(<Stack />);
    await user.click(screen.getByRole('button', { name: 'Open drawer' }));
    await user.click(screen.getByLabelText('Filter'));
    await user.keyboard('abc{Escape}');
    expect(screen.queryByText('Drawer open')).not.toBeInTheDocument();
  });

  it('respects enabled and cleans up on unmount', () => {
    const onEscape = vi.fn();
    const { rerender, unmount } = renderHook(({ enabled }) => useEscapeKey(onEscape, { enabled }), {
      initialProps: { enabled: false },
    });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
    rerender({ enabled: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('a disabled upper layer does not block the one below', () => {
    const lower = vi.fn();
    const upper = vi.fn();
    renderHook(() => useEscapeKey(lower));
    const { rerender } = renderHook(({ enabled }) => useEscapeKey(upper, { enabled }), {
      initialProps: { enabled: true },
    });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();
    rerender({ enabled: false });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(lower).toHaveBeenCalledTimes(1);
  });
});
