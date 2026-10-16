import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { useFullscreen } from './useFullscreen';

function Viewer() {
  const { ref, isFullscreen, isSupported, enter, exit, toggle, error } =
    useFullscreen<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="viewer">
      <p>{`fullscreen:${isFullscreen}|supported:${isSupported}|error:${error?.message ?? '-'}`}</p>
      <button type="button" onClick={() => void enter()}>
        Enter
      </button>
      <button type="button" onClick={() => void exit()}>
        Exit
      </button>
      <button type="button" onClick={() => void toggle()}>
        Toggle
      </button>
    </div>
  );
}

let fullscreenElement: Element | null = null;
const restores: Array<() => void> = [];

function setFullscreenElement(element: Element | null) {
  fullscreenElement = element;
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'));
  });
}

function installFullscreen() {
  restores.push(overrideProperty(document, 'fullscreenEnabled', true));
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  });
  const request = vi.fn(function (this: Element) {
    setFullscreenElement(this);
    return Promise.resolve();
  });
  const exit = vi.fn(() => {
    setFullscreenElement(null);
    return Promise.resolve();
  });
  Element.prototype.requestFullscreen = request;
  document.exitFullscreen = exit;
  return { request, exit };
}

beforeEach(() => {
  fullscreenElement = null;
});

afterEach(() => {
  while (restores.length) restores.pop()?.();
  delete (Element.prototype as Partial<Element>).requestFullscreen;
  delete (document as Partial<Document>).exitFullscreen;
  delete (document as Partial<Document> & { fullscreenElement?: Element }).fullscreenElement;
});

describe('useFullscreen', () => {
  it('enters, exits and toggles the element', async () => {
    const user = userEvent.setup();
    const api = installFullscreen();
    render(<Viewer />);
    const status = screen.getByText(/fullscreen:/);
    expect(status).toHaveTextContent('fullscreen:false|supported:true');

    await user.click(screen.getByRole('button', { name: 'Enter' }));
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(status).toHaveTextContent('fullscreen:true');

    await user.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(api.exit).toHaveBeenCalledTimes(1);
    expect(status).toHaveTextContent('fullscreen:false');

    await user.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(status).toHaveTextContent('fullscreen:true');
  });

  it('follows fullscreenchange triggered outside the hook (e.g. Esc)', async () => {
    const user = userEvent.setup();
    installFullscreen();
    render(<Viewer />);
    await user.click(screen.getByRole('button', { name: 'Enter' }));
    setFullscreenElement(null);
    expect(screen.getByText(/fullscreen:/)).toHaveTextContent('fullscreen:false');
  });

  it('is not "fullscreen" when another element is', () => {
    installFullscreen();
    render(<Viewer />);
    setFullscreenElement(document.body);
    expect(screen.getByText(/fullscreen:/)).toHaveTextContent('fullscreen:false');
  });

  it('captures request failures in error instead of rejecting', async () => {
    const user = userEvent.setup();
    const api = installFullscreen();
    api.request.mockImplementation(() => Promise.reject(new TypeError('Permissions check failed')));
    render(<Viewer />);
    await user.click(screen.getByRole('button', { name: 'Enter' }));
    expect(screen.getByText(/fullscreen:/)).toHaveTextContent('error:Permissions check failed');
  });

  it('falls back to the webkit-prefixed API', async () => {
    const user = userEvent.setup();
    restores.push(overrideProperty(document, 'webkitFullscreenEnabled', true));
    const webkitRequest = vi.fn(() => undefined);
    (
      Element.prototype as Element & { webkitRequestFullscreen?: () => void }
    ).webkitRequestFullscreen = webkitRequest;
    render(<Viewer />);
    expect(screen.getByText(/fullscreen:/)).toHaveTextContent('supported:true');
    await user.click(screen.getByRole('button', { name: 'Enter' }));
    expect(webkitRequest).toHaveBeenCalledTimes(1);
    delete (Element.prototype as Element & { webkitRequestFullscreen?: () => void })
      .webkitRequestFullscreen;
  });

  it('reports unsupported browsers and errors on enter', async () => {
    const user = userEvent.setup();
    render(<Viewer />);
    const status = screen.getByText(/fullscreen:/);
    expect(status).toHaveTextContent('supported:false');
    await user.click(screen.getByRole('button', { name: 'Enter' }));
    expect(status).toHaveTextContent('error:The Fullscreen API is not supported');
    // exit() is a no-op when nothing is full screen.
    await user.click(screen.getByRole('button', { name: 'Exit' }));
  });

  it('removes its document listeners on unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<Viewer />);
    unmount();
    const types = remove.mock.calls.map(([type]) => type);
    expect(types).toEqual(expect.arrayContaining(['fullscreenchange', 'webkitfullscreenchange']));
  });
});
