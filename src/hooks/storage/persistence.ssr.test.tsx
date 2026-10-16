// Runs in the "ssr" Vitest project (Node, no DOM): every storage hook must
// render on the server without touching browser globals.
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useBroadcastChannel } from './useBroadcastChannel';
import { useCookie } from './useCookie';
import { useCrossTabState } from './useCrossTabState';
import { usePersistentState, webStorageAdapter } from './usePersistentState';
import { useSessionStorage } from './useSessionStorage';

function Storage() {
  const [step] = useSessionStorage('step', 1);
  const [locale] = useCookie('locale', { serverValue: 'en-GB' });
  const [missing] = useCookie('missing');
  const [prefs] = usePersistentState('prefs', 'light', { adapter: webStorageAdapter('local') });
  const [slide] = useCrossTabState('slides', 3);
  const channel = useBroadcastChannel('ssr');
  return (
    <p>{[step, locale, String(missing), prefs, slide, String(channel.isSupported)].join('|')}</p>
  );
}

describe('storage hooks on the server', () => {
  it('render initial / server values without window or document', () => {
    expect(typeof window).toBe('undefined');
    expect(renderToString(<Storage />)).toBe('<p>1|en-GB|null|light|3|false</p>');
  });
});
