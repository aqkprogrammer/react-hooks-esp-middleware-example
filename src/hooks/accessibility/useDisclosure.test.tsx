import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDisclosure } from './useDisclosure';

function Details({ defaultOpen }: { defaultOpen?: boolean }) {
  const disclosure = useDisclosure({ defaultOpen });
  return (
    <div>
      <button type="button" {...disclosure.triggerProps}>
        Shipping details
      </button>
      <div {...disclosure.panelProps}>Ships in 2 days.</div>
    </div>
  );
}

describe('useDisclosure', () => {
  it('wires aria-expanded / aria-controls and hides the panel', async () => {
    const user = userEvent.setup();
    render(<Details />);
    const trigger = screen.getByRole('button', { name: 'Shipping details' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    expect(panel).not.toBeNull();
    expect(panel).not.toBeVisible();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Ships in 2 days.')).toBeVisible();

    trigger.focus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard(' ');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('generates unique ids per instance and honours a custom id', () => {
    const a = renderHook(() => useDisclosure()).result.current;
    const b = renderHook(() => useDisclosure()).result.current;
    expect(a.panelProps.id).not.toBe(b.panelProps.id);
    const custom = renderHook(() => useDisclosure({ id: 'faq-1' })).result.current;
    expect(custom.triggerProps.id).toBe('faq-1-trigger');
    expect(custom.panelProps.id).toBe('faq-1-panel');
  });

  it('works controlled: reports requests and renders the given state', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(false);
      const disclosure = useDisclosure({
        open,
        onOpenChange: (next) => {
          onOpenChange(next);
          setOpen(next);
        },
      });
      return (
        <button type="button" {...disclosure.triggerProps}>
          Toggle
        </button>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');

    const { result } = renderHook(() => useDisclosure({ open: false, onOpenChange }));
    act(() => result.current.open());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(result.current.isOpen).toBe(false); // the parent did not update it
  });

  it('open/close/toggle in uncontrolled mode', () => {
    const { result } = renderHook(() => useDisclosure({ defaultOpen: true }));
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.setOpen(false));
    expect(result.current.panelProps.hidden).toBe(true);
  });
});
