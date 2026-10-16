import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { altTextAdvice, validateImage } from './imageRules';
import ImagePreviewScenario from './ImagePreviewScenario';

const original = {
  create: Object.getOwnPropertyDescriptor(URL, 'createObjectURL'),
  revoke: Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL'),
};
let createObjectURL: ReturnType<typeof vi.fn<(blob: Blob) => string>>;
let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>;

function restore(key: 'createObjectURL' | 'revokeObjectURL', descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(URL, key, descriptor);
  else delete (URL as unknown as Record<string, unknown>)[key];
}

beforeEach(() => {
  let count = 0;
  createObjectURL = vi.fn((_blob: Blob) => `blob:mock/${(count += 1)}`);
  revokeObjectURL = vi.fn((_url: string) => {});
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
});

afterEach(() => {
  restore('createObjectURL', original.create);
  restore('revokeObjectURL', original.revoke);
});

const png = (name: string) => new File(['png-bytes'], name, { type: 'image/png' });
const chooser = () => screen.getByLabelText('Choose images');
const card = (name: string) => {
  const element = screen.getByText(name, { selector: 'strong' }).closest('li');
  if (!element) throw new Error(`no card for ${name}`);
  return element;
};

const imageIn = (element: HTMLElement) => {
  const img = element.querySelector('img');
  if (!img) throw new Error('no <img>');
  return img;
};

function loadImage(img: HTMLElement, width: number, height: number) {
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: width });
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: height });
  fireEvent.load(img);
}

describe('image rules', () => {
  it('validates files and gives alt text advice', () => {
    expect(validateImage(png('a.png'))).toBeNull();
    expect(validateImage(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toMatch(
      /not an image/,
    );
    expect(altTextAdvice('cat', 'cat.png')).toMatch(/file name/);
    expect(altTextAdvice('Image of a cat', 'x.png')).toMatch(/already say/);
    expect(altTextAdvice('A cat asleep on a keyboard', 'x.png')).toBeNull();
  });
});

describe('ImagePreviewScenario', () => {
  it('creates one object URL per image and shows dimensions after load', async () => {
    const user = userEvent.setup();
    render(<ImagePreviewScenario />);
    await user.upload(chooser(), [png('cat.png'), png('dog.png')]);
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    const img = imageIn(card('cat.png'));
    expect(img).toHaveAttribute('src', 'blob:mock/1');
    expect(within(card('cat.png')).getByText(/Loading/)).toBeInTheDocument();
    loadImage(img, 640, 480);
    expect(within(card('cat.png')).getByText(/640 × 480 px/)).toBeInTheDocument();
  });

  it('reports images that fail to decode', async () => {
    const user = userEvent.setup();
    render(<ImagePreviewScenario />);
    await user.upload(chooser(), png('broken.png'));
    fireEvent.error(imageIn(card('broken.png')));
    expect(within(card('broken.png')).getByText(/Could not decode/)).toBeInTheDocument();
  });

  it('revokes the URL on removal, replacement and unmount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ImagePreviewScenario />);
    await user.upload(chooser(), [png('a.png'), png('b.png'), png('c.png')]);

    await user.click(within(card('a.png')).getByRole('button', { name: 'Remove a.png' }));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/1');
    expect(chooser()).toHaveFocus();

    await user.upload(within(card('b.png')).getByLabelText('Replace b.png'), png('b2.png'));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/2');
    expect(imageIn(card('b2.png'))).toHaveAttribute('src', 'blob:mock/4');

    revokeObjectURL.mockClear();
    unmount();
    expect(revokeObjectURL.mock.calls.map(([url]) => url).sort()).toEqual([
      'blob:mock/3',
      'blob:mock/4',
    ]);
  });

  it('revokes every URL when removing all images', async () => {
    const user = userEvent.setup();
    render(<ImagePreviewScenario />);
    await user.upload(chooser(), [png('a.png'), png('b.png')]);
    await user.click(screen.getByRole('button', { name: 'Remove all' }));
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(screen.getByText('No images selected.')).toBeInTheDocument();
  });

  it('requires alt text or an explicit decorative choice before publishing', async () => {
    const user = userEvent.setup();
    render(<ImagePreviewScenario />);
    await user.upload(chooser(), [png('team.png'), png('divider.png')]);
    await user.click(screen.getByRole('button', { name: 'Publish gallery' }));
    const teamAlt = screen.getByLabelText('Alt text for team.png');
    expect(teamAlt).toHaveFocus();
    expect(teamAlt).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('2 image(s) still need alt text.');

    await user.type(teamAlt, 'Five people around a whiteboard');
    expect(within(card('team.png')).getByRole('img')).toHaveAccessibleName(
      'Five people around a whiteboard',
    );
    await user.click(within(card('divider.png')).getByLabelText(/Decorative/));
    // Decorative images get alt="" so assistive technology skips them.
    expect(within(card('divider.png')).getByRole('presentation')).toHaveAttribute('alt', '');
    await user.click(screen.getByRole('button', { name: 'Publish gallery' }));
    expect(screen.getByRole('status')).toHaveTextContent('Gallery ready: 2 images');
  });

  it('rejects files that are not images', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ImagePreviewScenario />);
    await user.upload(chooser(), new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('list', { name: 'Rejected files' })).toHaveTextContent(
      'doc.pdf: not an image (application/pdf).',
    );
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('explains when object URLs are unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: undefined });
    render(<ImagePreviewScenario />);
    expect(screen.getByText('Previews are unavailable')).toBeInTheDocument();
    await user.upload(chooser(), png('a.png'));
    expect(within(card('a.png')).getByText('No preview')).toBeInTheDocument();
  });
});
