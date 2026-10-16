/**
 * A framework-agnostic upload queue: chunked uploads, a concurrency limit,
 * per-file cancel (AbortController) and resumable retry. State lives in a
 * `createStore` store so React reads it with `useExternalStore`; the
 * `File` objects and controllers stay outside the state (they are not
 * serialisable and never need to trigger renders).
 */
import { createStore, fetchJson, type ExternalStore } from '../../../hooks';
import { isAbortError } from './abort';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'canceled';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  type: string;
  chunkSize: number;
  totalChunks: number;
  /** Chunks the server confirmed. Retry resumes from here. */
  chunksDone: number;
  status: UploadStatus;
  error: string | null;
}

export interface UploadState {
  items: readonly UploadItem[];
  concurrency: number;
}

export interface UploadManagerOptions {
  concurrency?: number;
  /** Forwarded as `?delay=` to the mock endpoint (latency per chunk). */
  chunkDelayMs?: number;
  /** Called when an upload finishes, fails or is cancelled. */
  onSettled?: (item: UploadItem) => void;
}

export interface UploadManager {
  store: ExternalStore<UploadState>;
  /** Queue files (already validated) split into `chunkSize`-byte chunks. */
  add: (files: readonly File[], chunkSize: number) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
  setConcurrency: (concurrency: number) => void;
  /** Start processing the queue (call on mount). */
  activate: () => void;
  /** Abort everything in flight and stop starting new uploads (call on unmount). */
  dispose: () => void;
}

let sequence = 0;
const nextId = () => `upl-${Date.now().toString(36)}-${(sequence += 1)}`;

export function createUploadManager(options: UploadManagerOptions = {}): UploadManager {
  const { chunkDelayMs, onSettled } = options;
  const store = createStore<UploadState>({ items: [], concurrency: options.concurrency ?? 2 });
  const files = new Map<string, File>();
  const controllers = new Map<string, AbortController>();
  let active = false;

  const find = (id: string) => store.getState().items.find((item) => item.id === id);
  const update = (id: string, patch: Partial<UploadItem>) =>
    store.setState((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const settle = (id: string) => {
    const item = find(id);
    if (item) onSettled?.(item);
  };

  const query = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    if (chunkDelayMs !== undefined) params.set('delay', String(chunkDelayMs));
    return params.toString();
  };

  async function upload(id: string): Promise<void> {
    const file = files.get(id);
    const item = find(id);
    if (!file || !item) return;
    const controller = new AbortController();
    controllers.set(id, controller);
    update(id, { status: 'uploading', error: null });
    const headers = { 'content-type': 'application/octet-stream', 'x-file-name': item.name };
    try {
      for (let index = item.chunksDone; index < item.totalChunks; index += 1) {
        const start = index * item.chunkSize;
        const chunk = file.slice(start, Math.min(file.size, start + item.chunkSize));
        await fetchJson(
          `/api/uploads/${id}/chunks?${query({ index: String(index), total: String(item.totalChunks) })}`,
          { method: 'POST', body: chunk, headers, signal: controller.signal },
        );
        update(id, { chunksDone: index + 1 });
      }
      await fetchJson(`/api/uploads/${id}/complete?${query({})}`, {
        method: 'POST',
        signal: controller.signal,
      });
      update(id, { status: 'done' });
      settle(id);
    } catch (error) {
      // Cancelled (or unmounted): `cancel`/`dispose` already set the status.
      if (controller.signal.aborted || isAbortError(error)) return;
      update(id, {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      settle(id);
    } finally {
      if (controllers.get(id) === controller) controllers.delete(id);
      pump();
    }
  }

  /** Start queued uploads until `concurrency` are in flight. */
  function pump(): void {
    if (!active) return;
    const { items, concurrency } = store.getState();
    let running = items.filter((item) => item.status === 'uploading').length;
    for (const item of items) {
      if (running >= concurrency) break;
      if (item.status !== 'queued') continue;
      running += 1;
      void upload(item.id);
    }
  }

  const discardOnServer = (id: string) => {
    // Fire-and-forget: the server frees the partial chunks.
    void fetch(`/api/uploads/${id}`, { method: 'DELETE' }).catch(() => undefined);
  };

  return {
    store,
    add(newFiles, chunkSize) {
      const added: UploadItem[] = newFiles.map((file) => {
        const id = nextId();
        files.set(id, file);
        return {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          chunkSize,
          totalChunks: Math.max(1, Math.ceil(file.size / chunkSize)),
          chunksDone: 0,
          status: 'queued',
          error: null,
        };
      });
      store.setState((state) => ({ items: [...state.items, ...added] }));
      pump();
    },
    cancel(id) {
      const item = find(id);
      if (!item || (item.status !== 'uploading' && item.status !== 'queued')) return;
      const wasUploading = item.status === 'uploading';
      controllers.get(id)?.abort();
      controllers.delete(id);
      // A cancelled upload is discarded: retry starts again from chunk 1.
      update(id, { status: 'canceled', chunksDone: 0, error: null });
      if (wasUploading || item.chunksDone > 0) discardOnServer(id);
      settle(id);
      pump();
    },
    retry(id) {
      const item = find(id);
      if (!item || (item.status !== 'error' && item.status !== 'canceled')) return;
      update(id, { status: 'queued', error: null });
      pump();
    },
    remove(id) {
      const item = find(id);
      if (!item || item.status === 'uploading' || item.status === 'queued') return;
      files.delete(id);
      store.setState((state) => ({ items: state.items.filter((entry) => entry.id !== id) }));
    },
    clearFinished() {
      const finished = store.getState().items.filter((item) => item.status === 'done');
      finished.forEach((item) => files.delete(item.id));
      store.setState((state) => ({
        items: state.items.filter((item) => item.status !== 'done'),
      }));
    },
    setConcurrency(concurrency) {
      store.setState({ concurrency: Math.max(1, Math.floor(concurrency)) });
      pump();
    },
    activate() {
      active = true;
      pump();
    },
    dispose() {
      active = false;
      for (const [id, controller] of controllers) {
        controller.abort();
        // Back to the queue: if the component mounts again (Strict Mode), it resumes.
        update(id, { status: 'queued' });
      }
      controllers.clear();
    },
  };
}
