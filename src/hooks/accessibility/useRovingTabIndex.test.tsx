import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useRovingTabIndex, type UseRovingTabIndexOptions } from './useRovingTabIndex';

const ITEMS = ['Bold', 'Italic', 'Underline', 'Strike'];

function Toolbar(props: Partial<UseRovingTabIndexOptions> & { disabled?: number[] }) {
  const { disabled = [], ...options } = props;
  const roving = useRovingTabIndex({
    count: ITEMS.length,
    isDisabled: (index) => disabled.includes(index),
    ...options,
  });
  return (
    <div>
      <button type="button">Before</button>
      <div role="toolbar" aria-label="Formatting">
        {ITEMS.map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={disabled.includes(index)}
            {...roving.getItemProps(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <button type="button">After</button>
    </div>
  );
}

const button = (name: string) => screen.getByRole('button', { name });

describe('useRovingTabIndex', () => {
  it('makes the group a single Tab stop and remembers the active item', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    expect(button('Bold')).toHaveAttribute('tabindex', '0');
    expect(button('Italic')).toHaveAttribute('tabindex', '-1');

    await user.click(button('Before'));
    await user.tab();
    expect(button('Bold')).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(button('Underline')).toHaveFocus();
    await user.tab();
    expect(button('After')).toHaveFocus();
    await user.tab({ shift: true });
    expect(button('Underline')).toHaveFocus();
  });

  it('wraps with arrows, jumps with Home/End and skips disabled items', async () => {
    const user = userEvent.setup();
    render(<Toolbar disabled={[3]} />);
    await user.click(button('Bold'));
    await user.keyboard('{ArrowLeft}');
    expect(button('Underline')).toHaveFocus(); // wrapped, skipping disabled "Strike"
    await user.keyboard('{ArrowRight}');
    expect(button('Bold')).toHaveFocus();
    await user.keyboard('{End}');
    expect(button('Underline')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(button('Bold')).toHaveFocus();
  });

  it('stops at the ends when loop is false', async () => {
    const user = userEvent.setup();
    render(<Toolbar loop={false} />);
    await user.click(button('Bold'));
    await user.keyboard('{ArrowLeft}');
    expect(button('Bold')).toHaveFocus();
    await user.keyboard('{End}{ArrowRight}');
    expect(button('Strike')).toHaveFocus();
  });

  it('uses Up/Down for vertical groups and swaps Left/Right in RTL', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Toolbar orientation="vertical" />);
    await user.click(button('Bold'));
    await user.keyboard('{ArrowRight}');
    expect(button('Bold')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(button('Italic')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(button('Bold')).toHaveFocus();
    unmount();

    render(<Toolbar dir="rtl" />);
    await user.click(button('Bold'));
    await user.keyboard('{ArrowLeft}');
    expect(button('Italic')).toHaveFocus();
  });

  it('follows clicks/focus and reports changes', async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(<Toolbar onActiveChange={onActiveChange} />);
    await user.click(button('Underline'));
    expect(button('Underline')).toHaveAttribute('tabindex', '0');
    expect(button('Bold')).toHaveAttribute('tabindex', '-1');
    expect(onActiveChange).toHaveBeenCalledWith(2);
  });

  it('ignores modified arrow keys', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.click(button('Bold'));
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    expect(button('Bold')).toHaveFocus();
  });

  it('falls back to the first enabled item when the active one is disabled or removed', async () => {
    const user = userEvent.setup();
    function Dynamic() {
      const [count, setCount] = useState(4);
      const roving = useRovingTabIndex({ count, initialIndex: 3 });
      return (
        <div>
          {ITEMS.slice(0, count).map((label, index) => (
            <button key={label} type="button" {...roving.getItemProps(index)}>
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setCount(2)}>
            Shrink
          </button>
        </div>
      );
    }
    render(<Dynamic />);
    expect(button('Strike')).toHaveAttribute('tabindex', '0');
    await user.click(button('Shrink'));
    expect(button('Bold')).toHaveAttribute('tabindex', '0');
  });
});
