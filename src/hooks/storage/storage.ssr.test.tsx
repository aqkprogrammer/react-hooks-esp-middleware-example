// Runs in the "ssr" Vitest project (Node, no DOM) to prove these hooks can be
// rendered on the server without touching browser globals.
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useMediaQuery } from '../browser/useMediaQuery';
import { useLocalStorage } from './useLocalStorage';

function Preferences() {
  const [theme] = useLocalStorage('theme', 'light');
  const wide = useMediaQuery('(min-width: 900px)', { defaultValue: true });
  return (
    <p>
      {theme}/{String(wide)}
    </p>
  );
}

describe('SSR safety', () => {
  it('renders initial/default values without window or document', () => {
    expect(typeof window).toBe('undefined');
    expect(renderToString(<Preferences />)).toBe('<p>light<!-- -->/<!-- -->true</p>');
  });
});
