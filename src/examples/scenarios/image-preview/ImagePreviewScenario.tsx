import { useId, useRef, useState, type ChangeEvent } from 'react';
import { flushSync } from 'react-dom';
import { Badge, Button, Callout, Panel, TextField } from '../../../components/ui';
import { altTextAdvice, formatBytes, validateImage } from './imageRules';
import { useObjectUrls } from './useObjectUrls';
import './ImagePreviewScenario.css';

interface PreviewItem {
  id: string;
  file: File;
  /** `null` when object URLs are unavailable. */
  url: string | null;
  alt: string;
  decorative: boolean;
  status: 'loading' | 'loaded' | 'error';
  width: number | null;
  height: number | null;
}

let sequence = 0;
const nextId = () => `img-${(sequence += 1)}`;

/**
 * Local image previews with `URL.createObjectURL`: URLs are created in event
 * handlers and revoked on removal, replacement and unmount. Every image needs
 * alt text (or an explicit "decorative" choice) before the gallery can be published.
 */
export default function ImagePreviewScenario() {
  const { isSupported, create, revoke } = useObjectUrls();
  const [items, setItems] = useState<readonly PreviewItem[]>([]);
  const [rejected, setRejected] = useState<readonly string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [published, setPublished] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLUListElement>(null);
  const inputId = useId();

  const toItem = (file: File): PreviewItem => ({
    id: nextId(),
    file,
    url: create(file),
    alt: '',
    decorative: false,
    status: 'loading',
    width: null,
    height: null,
  });

  const onAdd = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      const problem = validateImage(file);
      if (problem) problems.push(`${file.name}: ${problem}`);
      else accepted.push(file);
    }
    setRejected(problems);
    setPublished(null);
    // URLs are created here, in the event handler — not in render or an updater.
    const added = accepted.map(toItem);
    setItems((current) => [...current, ...added]);
  };

  const update = (id: string, patch: Partial<PreviewItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const remove = (item: PreviewItem) => {
    revoke(item.url);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setPublished(null);
    inputRef.current?.focus();
  };

  const replace = (item: PreviewItem, file: File | undefined) => {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) {
      setRejected([`${file.name}: ${problem}`]);
      return;
    }
    revoke(item.url);
    // The old alt text described the old image, so it must be written again.
    update(item.id, { ...toItem(file), id: item.id });
    setPublished(null);
  };

  const clearAll = () => {
    items.forEach((item) => revoke(item.url));
    setItems([]);
    setShowErrors(false);
    setPublished(null);
  };

  const isMissingAlt = (item: PreviewItem) => !item.decorative && item.alt.trim() === '';

  const publish = () => {
    const missing = items.filter(isMissingAlt);
    if (missing.length > 0) {
      // Render the errors synchronously, then move focus to the first invalid field.
      flushSync(() => setShowErrors(true));
      galleryRef.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus();
      setPublished(null);
      return;
    }
    setShowErrors(false);
    setPublished(items.length);
  };

  return (
    <div className="stack">
      {isSupported ? null : (
        <Callout tone="warn" title="Previews are unavailable">
          This browser does not support <code>URL.createObjectURL</code>. You can still add alt
          text; the images are listed by name.
        </Callout>
      )}
      <Panel
        title="Add images"
        description="Previews are created locally with object URLs. Nothing is uploaded."
      >
        <div className="row">
          <input
            ref={inputRef}
            id={inputId}
            className="visually-hidden image-preview-input"
            type="file"
            accept="image/*"
            multiple
            onChange={onAdd}
          />
          <label htmlFor={inputId} className="btn btn-primary">
            Choose images
          </label>
          <Button variant="danger" onClick={clearAll} disabled={items.length === 0}>
            Remove all
          </Button>
          <Badge tone="info">
            {items.length} image{items.length === 1 ? '' : 's'}
          </Badge>
        </div>
        {rejected.length > 0 ? (
          <Callout tone="warn" title="Not added">
            <ul className="image-preview-rejected" aria-label="Rejected files">
              {rejected.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Callout>
        ) : null}
      </Panel>

      {items.length > 0 ? (
        <ul ref={galleryRef} className="image-preview-grid" aria-label="Selected images">
          {items.map((item) => (
            <PreviewCard
              key={item.id}
              item={item}
              showError={showErrors && isMissingAlt(item)}
              onChange={(patch) => update(item.id, patch)}
              onRemove={() => remove(item)}
              onReplace={(file) => replace(item, file)}
            />
          ))}
        </ul>
      ) : (
        <p className="muted">No images selected.</p>
      )}

      <div className="row">
        <Button variant="primary" onClick={publish} disabled={items.length === 0}>
          Publish gallery
        </Button>
        {/* Inline status: announced by screen readers without moving focus. */}
        <span role="status" className="small">
          {published !== null
            ? `Gallery ready: ${published} image${published === 1 ? '' : 's'} with alt text decisions.`
            : showErrors && items.some(isMissingAlt)
              ? `${items.filter(isMissingAlt).length} image(s) still need alt text.`
              : ''}
        </span>
      </div>
    </div>
  );
}

function PreviewCard({
  item,
  showError,
  onChange,
  onRemove,
  onReplace,
}: {
  item: PreviewItem;
  showError: boolean;
  onChange: (patch: Partial<PreviewItem>) => void;
  onRemove: () => void;
  onReplace: (file: File | undefined) => void;
}) {
  const replaceId = useId();
  const decorativeId = useId();
  const advice = item.decorative ? null : altTextAdvice(item.alt, item.file.name);
  return (
    <li className="image-preview-card">
      <div className="image-preview-frame">
        {item.url ? (
          <img
            src={item.url}
            alt={item.decorative ? '' : item.alt}
            onLoad={(event) =>
              onChange({
                status: 'loaded',
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            onError={() => onChange({ status: 'error' })}
          />
        ) : (
          <span className="muted small">No preview</span>
        )}
      </div>
      <div className="image-preview-meta small">
        <strong className="image-preview-name">{item.file.name}</strong>
        <span className="muted">
          {formatBytes(item.file.size)} ·{' '}
          {item.status === 'loaded' && item.width !== null
            ? `${item.width} × ${item.height} px`
            : item.status === 'error'
              ? 'Could not decode this image'
              : item.url
                ? 'Loading…'
                : 'Dimensions unknown'}
        </span>
      </div>
      <TextField
        label={`Alt text for ${item.file.name}`}
        value={item.alt}
        disabled={item.decorative}
        required={!item.decorative}
        maxLength={250}
        onChange={(event) => onChange({ alt: event.target.value })}
        error={showError ? 'Describe the image, or mark it as decorative.' : undefined}
        hint={advice ?? 'What does the image show, and why is it here?'}
      />
      <div className="row small">
        <input
          id={decorativeId}
          type="checkbox"
          checked={item.decorative}
          onChange={(event) => onChange({ decorative: event.target.checked })}
        />
        <label htmlFor={decorativeId}>Decorative (screen readers skip it)</label>
      </div>
      <div className="row">
        <input
          id={replaceId}
          className="visually-hidden image-preview-input"
          type="file"
          accept="image/*"
          onChange={(event) => {
            onReplace(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <label htmlFor={replaceId} className="btn btn-sm">
          Replace <span className="visually-hidden">{item.file.name}</span>
        </label>
        <Button size="sm" variant="danger" onClick={onRemove}>
          Remove <span className="visually-hidden">{item.file.name}</span>
        </Button>
      </div>
    </li>
  );
}
