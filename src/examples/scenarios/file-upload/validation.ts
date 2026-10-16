/** Client-side checks run before a file is queued. The server must re-check: this is UX, not security. */
export interface FileRules {
  /** Allowed MIME types; `image/*` style wildcards are supported. */
  accept: readonly string[];
  /** Allowed extensions (lower case, with dot), used when the browser reports no MIME type. */
  extensions: readonly string[];
  maxBytes: number;
}

export const DEFAULT_RULES: FileRules = {
  accept: ['image/*', 'application/pdf', 'text/plain'],
  extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt'],
  maxBytes: 5 * 1024 * 1024,
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const matchesType = (type: string, pattern: string) =>
  pattern.endsWith('/*') ? type.startsWith(pattern.slice(0, -1)) : type === pattern;

/** Returns a human-readable reason, or `null` when the file is acceptable. */
export function validateFile(file: File, rules: FileRules = DEFAULT_RULES): string | null {
  if (file.size === 0) return 'The file is empty.';
  if (file.size > rules.maxBytes) {
    return `Too large: ${formatBytes(file.size)} (maximum ${formatBytes(rules.maxBytes)}).`;
  }
  const dot = file.name.lastIndexOf('.');
  const extension = dot === -1 ? '' : file.name.slice(dot).toLowerCase();
  const typeOk = file.type
    ? rules.accept.some((pattern) => matchesType(file.type, pattern))
    : rules.extensions.includes(extension);
  if (!typeOk) return `Unsupported type: ${file.type || extension || 'unknown'}.`;
  return null;
}
