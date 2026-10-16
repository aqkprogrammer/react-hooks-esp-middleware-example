export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns why `file` cannot be previewed, or `null`. `accept="image/*"` is only a hint to the picker. */
export function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/')) return `not an image (${file.type || 'unknown type'}).`;
  if (file.size === 0) return 'the file is empty.';
  if (file.size > MAX_IMAGE_BYTES) return `larger than ${formatBytes(MAX_IMAGE_BYTES)}.`;
  return null;
}

/** Gentle advice for common alt-text mistakes; `null` when nothing stands out. */
export function altTextAdvice(alt: string, fileName: string): string | null {
  const text = alt.trim();
  if (!text) return null;
  const baseName = fileName.replace(/\.[^.]+$/, '').toLowerCase();
  if (text.toLowerCase() === baseName || text.toLowerCase() === fileName.toLowerCase()) {
    return 'A file name is not a description — say what the image shows.';
  }
  if (/^(an? )?(image|picture|photo|graphic) of\b/i.test(text)) {
    return 'Screen readers already say "image": start with what it shows.';
  }
  if (text.length > 150) return 'Long descriptions are hard to listen to; consider a caption.';
  return null;
}
