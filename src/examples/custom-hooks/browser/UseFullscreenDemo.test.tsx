import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../../test/browserMocks';
import UseFullscreenDemo from './UseFullscreenDemo';

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length) restores.pop()?.();
  delete (Element.prototype as Partial<Element>).requestFullscreen;
  delete (document as Partial<Document>).exitFullscreen;
});

describe('UseFullscreenDemo', () => {
  it('explains when the Fullscreen API is unavailable', () => {
    render(<UseFullscreenDemo />);
    expect(screen.getByText('Full screen is unavailable here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter full screen' })).toBeDisabled();
  });

  it('enters and exits full screen', async () => {
    const user = userEvent.setup();
    let current: Element | null = null;
    const setCurrent = (element: Element | null) => {
      current = element;
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });
    };
    restores.push(overrideProperty(document, 'fullscreenEnabled', true));
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => current,
    });
    restores.push(
      () =>
        delete (document as Partial<Document> & { fullscreenElement?: Element }).fullscreenElement,
    );
    Element.prototype.requestFullscreen = vi.fn(function (this: Element) {
      setCurrent(this);
      return Promise.resolve();
    });
    document.exitFullscreen = vi.fn(() => {
      setCurrent(null);
      return Promise.resolve();
    });

    render(<UseFullscreenDemo />);
    await user.click(screen.getByRole('button', { name: 'Enter full screen' }));
    expect(screen.getByText(/presenting full screen/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(screen.getByText(/inline preview/)).toBeInTheDocument();
  });

  it('shows request errors', async () => {
    const user = userEvent.setup();
    restores.push(overrideProperty(document, 'fullscreenEnabled', true));
    Element.prototype.requestFullscreen = vi.fn(() =>
      Promise.reject(Object.assign(new Error('Permissions check failed'), { name: 'TypeError' })),
    );
    render(<UseFullscreenDemo />);
    await user.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByText('Request failed')).toBeInTheDocument();
    expect(screen.getByText(/Permissions check failed/)).toBeInTheDocument();
  });
});
