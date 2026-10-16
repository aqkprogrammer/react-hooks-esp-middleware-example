// Runs in the "ssr" Vitest project (Node, no DOM): every accessibility hook
// must render on the server without touching browser globals.
import { useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { isApplePlatform, parseShortcut } from './useKeyboardShortcut';
import { useAnnouncer } from './useAnnouncer';
import { useDialogState } from './useDialogState';
import { useDisclosure } from './useDisclosure';
import { useEscapeKey } from './useEscapeKey';
import { useFocusTrap } from './useFocusTrap';
import { useKeyboardShortcut } from './useKeyboardShortcut';
import { useRovingTabIndex } from './useRovingTabIndex';

function Everything() {
  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef);
  useEscapeKey(() => {});
  useKeyboardShortcut('mod+k', () => {});
  useAnnouncer();
  const disclosure = useDisclosure({ id: 'd' });
  const dialog = useDialogState();
  const roving = useRovingTabIndex({ count: 2 });
  return (
    <div ref={trapRef}>
      <button type="button" {...disclosure.triggerProps}>
        More
      </button>
      <div {...disclosure.panelProps}>Panel</div>
      <button type="button" {...roving.getItemProps(0)}>
        A
      </button>
      <button type="button" {...roving.getItemProps(1)}>
        B
      </button>
      <dialog {...dialog.dialogProps}>
        <h2 id={dialog.titleId}>Title</h2>
      </dialog>
    </div>
  );
}

describe('accessibility hooks on the server', () => {
  it('render without window/document and with ARIA attributes in the HTML', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToString(<Everything />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="d-panel"');
    expect(html).toContain('id="d-panel" hidden=""');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');
    expect(html).not.toContain('<dialog open');
  });

  it('pure helpers are safe on the server', () => {
    expect(isApplePlatform()).toBe(false);
    expect(parseShortcut('mod+k').mod).toBe(true);
  });
});
