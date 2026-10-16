import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import UseSyncExternalStoreBrowserDemo from './UseSyncExternalStoreBrowserDemo';

describe('UseSyncExternalStoreBrowserDemo on the server', () => {
  it('renders the server snapshots without touching window or document', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToString(<UseSyncExternalStoreBrowserDemo />);
    expect(html).toContain('Online');
    expect(html).toContain('visible');
    expect(html).toContain('Save changes');
  });
});
