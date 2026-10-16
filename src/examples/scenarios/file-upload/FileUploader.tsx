import { useEffect, useId, useState, type ChangeEvent, type DragEvent } from 'react';
import { Badge, Button, Callout } from '../../../components/ui';
import { useAnnouncer, useEventListener, useExternalStore } from '../../../hooks';
import { createUploadManager, type UploadItem, type UploadState } from './uploadManager';
import { DEFAULT_RULES, formatBytes, validateFile } from './validation';

export interface FileUploaderProps {
  /** Initial chunk size in bytes. */
  chunkSize?: number;
  /** Initial number of files uploaded at the same time. */
  concurrency?: number;
  /** Latency of each mocked chunk request, in ms. */
  chunkDelayMs?: number;
}

interface Rejection {
  key: string;
  name: string;
  reason: string;
}

const CHUNK_SIZES = [
  { label: '64 KB', value: 64 * 1024 },
  { label: '256 KB', value: 256 * 1024 },
  { label: '1 MB', value: 1024 * 1024 },
];

const selectItems = (state: UploadState) => state.items;
const selectConcurrency = (state: UploadState) => state.concurrency;

const statusTone = {
  queued: 'neutral',
  uploading: 'info',
  done: 'success',
  error: 'warn',
  canceled: 'neutral',
} as const;

const hasFiles = (event: globalThis.DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files');

let rejectionKey = 0;

/** File picker + drop zone feeding the chunked upload queue. */
export function FileUploader({
  chunkSize: initialChunkSize = 256 * 1024,
  concurrency: initialConcurrency = 2,
  chunkDelayMs,
}: FileUploaderProps) {
  const { announce } = useAnnouncer();
  // `announce` is stable (useCallback with no deps), so capturing it once is safe.
  const [manager] = useState(() =>
    createUploadManager({
      concurrency: initialConcurrency,
      ...(chunkDelayMs === undefined ? {} : { chunkDelayMs }),
      onSettled: (item) => {
        const message =
          item.status === 'done'
            ? `${item.name} uploaded.`
            : item.status === 'error'
              ? `${item.name} failed: ${item.error ?? 'unknown error'}`
              : `${item.name} cancelled.`;
        announce(message, { politeness: item.status === 'error' ? 'assertive' : 'polite' });
      },
    }),
  );
  const items = useExternalStore(manager.store, selectItems);
  const concurrency = useExternalStore(manager.store, selectConcurrency);
  const [chunkSize, setChunkSize] = useState(initialChunkSize);
  const [rejections, setRejections] = useState<readonly Rejection[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputId = useId();
  const hintId = useId();

  // Start the queue on mount; abort in-flight requests on unmount.
  useEffect(() => {
    manager.activate();
    return () => manager.dispose();
  }, [manager]);

  // A file dropped *next to* the drop zone would otherwise make the browser
  // navigate away and open it.
  useEventListener('dragover', (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
  useEventListener('drop', (event) => {
    if (hasFiles(event)) event.preventDefault();
  });

  const addFiles = (list: FileList | readonly File[]) => {
    const accepted: File[] = [];
    const rejected: Rejection[] = [];
    for (const file of Array.from(list)) {
      const reason = validateFile(file);
      if (reason) rejected.push({ key: `r${(rejectionKey += 1)}`, name: file.name, reason });
      else accepted.push(file);
    }
    setRejections(rejected);
    if (accepted.length) manager.add(accepted, chunkSize);
    if (rejected.length) {
      announce(`${rejected.length} file${rejected.length === 1 ? '' : 's'} rejected.`);
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    // Allow picking the same file again.
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  };

  const counts = items.reduce<Record<UploadItem['status'], number>>(
    (acc, item) => ({ ...acc, [item.status]: acc[item.status] + 1 }),
    { queued: 0, uploading: 0, done: 0, error: 0, canceled: 0 },
  );

  return (
    <div className="stack">
      <div
        className={['upload-dropzone', dragActive ? 'upload-dropzone-active' : ''].join(' ').trim()}
        onDragEnter={(event) => {
          if (hasFiles(event.nativeEvent)) setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(event) => {
          // Ignore leave events fired when moving over child elements.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragActive(false);
        }}
        onDrop={onDrop}
      >
        <p className="upload-dropzone-title">Drop files here</p>
        <p className="muted small" id={hintId}>
          PNG, JPEG, GIF, WebP, PDF or TXT, up to {formatBytes(DEFAULT_RULES.maxBytes)} each.
        </p>
        {/* The real input stays in the tab order; the label is its visible, clickable face. */}
        <input
          id={inputId}
          className="visually-hidden upload-input"
          type="file"
          multiple
          accept={[...DEFAULT_RULES.accept, ...DEFAULT_RULES.extensions].join(',')}
          aria-describedby={hintId}
          onChange={onInputChange}
        />
        <label htmlFor={inputId} className="btn btn-primary">
          Choose files
        </label>
      </div>

      <div className="row">
        <label className="row small">
          Parallel uploads
          <select
            value={concurrency}
            onChange={(event) => manager.setConcurrency(Number(event.target.value))}
          >
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="row small">
          Chunk size (new files)
          <select value={chunkSize} onChange={(event) => setChunkSize(Number(event.target.value))}>
            {CHUNK_SIZES.some((option) => option.value === chunkSize) ? null : (
              <option value={chunkSize}>{formatBytes(chunkSize)}</option>
            )}
            {CHUNK_SIZES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" onClick={manager.clearFinished} disabled={counts.done === 0}>
          Clear finished
        </Button>
      </div>

      {rejections.length > 0 ? (
        <Callout tone="warn" title="Not added">
          <ul className="upload-rejections" aria-label="Rejected files">
            {rejections.map((rejection) => (
              <li key={rejection.key}>
                <strong>{rejection.name}</strong>: {rejection.reason}
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}

      <p className="small muted">
        {counts.uploading} uploading · {counts.queued} queued · {counts.done} done · {counts.error}{' '}
        failed · {counts.canceled} cancelled
      </p>

      {items.length === 0 ? (
        <p className="muted">No uploads yet.</p>
      ) : (
        <ul className="upload-list" aria-label="Uploads">
          {items.map((item) => (
            <UploadRow
              key={item.id}
              item={item}
              onCancel={manager.cancel}
              onRetry={manager.retry}
              onRemove={manager.remove}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadRow({
  item,
  onCancel,
  onRetry,
  onRemove,
}: {
  item: UploadItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const active = item.status === 'uploading' || item.status === 'queued';
  return (
    <li className="upload-row">
      <div className="spread">
        <span>
          <strong>{item.name}</strong>{' '}
          <span className="muted small">
            {formatBytes(item.size)} · {item.type || 'unknown type'}
          </span>
        </span>
        <Badge tone={statusTone[item.status]}>{item.status}</Badge>
      </div>
      <progress
        className="progress"
        max={item.totalChunks}
        value={item.chunksDone}
        aria-label={`Upload progress for ${item.name}`}
      />
      <div className="spread">
        <span className="small mono">
          {item.chunksDone} / {item.totalChunks} chunks
        </span>
        <span className="row">
          {active ? (
            <Button size="sm" variant="danger" onClick={() => onCancel(item.id)}>
              Cancel <span className="visually-hidden">{item.name}</span>
            </Button>
          ) : null}
          {item.status === 'error' || item.status === 'canceled' ? (
            <Button size="sm" onClick={() => onRetry(item.id)}>
              Retry <span className="visually-hidden">{item.name}</span>
            </Button>
          ) : null}
          {!active ? (
            <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
              Remove <span className="visually-hidden">{item.name}</span>
            </Button>
          ) : null}
        </span>
      </div>
      {item.error ? <p className="field-error">{item.error}</p> : null}
    </li>
  );
}
