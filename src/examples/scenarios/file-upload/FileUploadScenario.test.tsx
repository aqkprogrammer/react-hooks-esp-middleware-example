import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetScenarioUploads } from '../../../mocks/extra/scenariosAdvanced';
import { server } from '../../../test/server';
import { FileUploader } from './FileUploader';
import FileUploadScenario from './FileUploadScenario';
import { validateFile } from './validation';

afterEach(() => resetScenarioUploads());

const textFile = (name: string, bytes: number) =>
  new File(['x'.repeat(bytes)], name, { type: 'text/plain' });

const fileInput = () => screen.getByLabelText('Choose files');

function row(name: string): HTMLElement {
  const list = screen.getByRole('list', { name: 'Uploads' });
  const item = within(list).getByText(name, { selector: 'strong' }).closest('li');
  if (!item) throw new Error(`No upload row for ${name}`);
  return item;
}

describe('validateFile', () => {
  it('rejects empty, oversized and unsupported files', () => {
    expect(validateFile(textFile('a.txt', 3))).toBeNull();
    expect(validateFile(new File([], 'empty.txt', { type: 'text/plain' }))).toBe(
      'The file is empty.',
    );
    expect(validateFile(new File(['x'], 'a.zip', { type: 'application/zip' }))).toBe(
      'Unsupported type: application/zip.',
    );
    expect(validateFile(new File(['x'], 'photo.PNG'))).toBeNull(); // no MIME type: extension
    expect(validateFile(textFile('big.txt', 5 * 1024 * 1024 + 1))).toMatch(/^Too large/);
  });
});

describe('FileUploadScenario', () => {
  it('labels the upload as mocked and uploads a file end to end', async () => {
    const user = userEvent.setup();
    render(<FileUploadScenario />);
    expect(screen.getByRole('note', { name: '' })).toHaveTextContent('Mocked upload');
    await user.upload(fileInput(), textFile('hello.txt', 12));
    await waitFor(() => expect(within(row('hello.txt')).getByText('done')).toBeInTheDocument());
    expect(within(row('hello.txt')).getByText('1 / 1 chunks')).toBeInTheDocument();
  });
});

describe('FileUploader', () => {
  it('uploads in chunks and reports progress per file', async () => {
    const user = userEvent.setup();
    const indexes: number[] = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/chunks')) indexes.push(Number(url.searchParams.get('index')));
    });
    render(<FileUploader chunkSize={4} chunkDelayMs={5} />);
    await user.upload(fileInput(), textFile('notes.txt', 16));
    await waitFor(() => expect(within(row('notes.txt')).getByText('done')).toBeInTheDocument());
    expect(within(row('notes.txt')).getByText('4 / 4 chunks')).toBeInTheDocument();
    expect(within(row('notes.txt')).getByRole('progressbar')).toHaveAttribute('value', '4');
    expect(indexes).toEqual([0, 1, 2, 3]);
    server.events.removeAllListeners();
    await waitFor(() =>
      expect(document.querySelector('[data-live-announcer="polite"]')).toHaveTextContent(
        'notes.txt uploaded.',
      ),
    );
  });

  it('validates files before queueing them', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<FileUploader chunkSize={4} chunkDelayMs={5} />);
    await user.upload(fileInput(), [
      new File(['zip'], 'archive.zip', { type: 'application/zip' }),
      new File([], 'empty.txt', { type: 'text/plain' }),
      textFile('ok.txt', 4),
    ]);
    const rejected = screen.getByRole('list', { name: 'Rejected files' });
    expect(rejected).toHaveTextContent('archive.zip: Unsupported type: application/zip.');
    expect(rejected).toHaveTextContent('empty.txt: The file is empty.');
    expect(
      within(screen.getByRole('list', { name: 'Uploads' })).getAllByRole('listitem'),
    ).toHaveLength(1);
  });

  it('respects the concurrency limit', async () => {
    const user = userEvent.setup();
    render(<FileUploader chunkSize={4} chunkDelayMs={20} concurrency={1} />);
    await user.upload(fileInput(), [
      textFile('a.txt', 8),
      textFile('b.txt', 8),
      textFile('c.txt', 8),
    ]);
    expect(within(row('a.txt')).getByText('uploading')).toBeInTheDocument();
    expect(within(row('b.txt')).getByText('queued')).toBeInTheDocument();
    expect(within(row('c.txt')).getByText('queued')).toBeInTheDocument();
    await waitFor(() => expect(within(row('a.txt')).getByText('done')).toBeInTheDocument());
    expect(within(row('c.txt')).queryByText('uploading')).not.toBeInTheDocument();
    await waitFor(() => expect(within(row('c.txt')).getByText('done')).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it('cancels one file without affecting the others and discards it on the server', async () => {
    const user = userEvent.setup();
    const abort = vi.spyOn(AbortController.prototype, 'abort');
    const deleted: string[] = [];
    server.use(
      http.delete('/api/uploads/:id', ({ params }) => {
        deleted.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(<FileUploader chunkSize={4} chunkDelayMs={30} concurrency={2} />);
    await user.upload(fileInput(), [textFile('keep.txt', 8), textFile('drop.txt', 40)]);
    await user.click(within(row('drop.txt')).getByRole('button', { name: 'Cancel drop.txt' }));
    expect(within(row('drop.txt')).getByText('canceled')).toBeInTheDocument();
    expect(within(row('drop.txt')).getByText('0 / 10 chunks')).toBeInTheDocument();
    expect(abort).toHaveBeenCalled();
    await waitFor(() => expect(deleted).toHaveLength(1));
    await waitFor(() => expect(within(row('keep.txt')).getByText('done')).toBeInTheDocument());

    // A cancelled file can be retried from the start, or removed.
    await user.click(within(row('drop.txt')).getByRole('button', { name: 'Remove drop.txt' }));
    expect(screen.queryByText('drop.txt')).not.toBeInTheDocument();
  });

  it('resumes a failed upload from the failed chunk on retry', async () => {
    const user = userEvent.setup();
    const indexes: number[] = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith('/chunks')) indexes.push(Number(url.searchParams.get('index')));
    });
    render(<FileUploader chunkSize={4} chunkDelayMs={5} />);
    await user.upload(fileInput(), textFile('fail-report.txt', 12));
    await waitFor(() =>
      expect(within(row('fail-report.txt')).getByText('error')).toBeInTheDocument(),
    );
    expect(within(row('fail-report.txt')).getByText('1 / 3 chunks')).toBeInTheDocument();
    expect(row('fail-report.txt')).toHaveTextContent('Chunk 2 of 3 failed (simulated 503)');
    await user.click(screen.getByRole('button', { name: 'Retry fail-report.txt' }));
    await waitFor(() =>
      expect(within(row('fail-report.txt')).getByText('done')).toBeInTheDocument(),
    );
    expect(indexes).toEqual([0, 1, 1, 2]);
    server.events.removeAllListeners();
  });

  it('accepts files dropped on the drop zone', async () => {
    render(<FileUploader chunkSize={4} chunkDelayMs={5} />);
    const zone = screen.getByText('Drop files here').parentElement as HTMLElement;
    const file = textFile('dropped.txt', 4);
    fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'], files: [file] } });
    expect(zone).toHaveClass('upload-dropzone-active');
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [file] } });
    expect(zone).not.toHaveClass('upload-dropzone-active');
    await waitFor(() => expect(within(row('dropped.txt')).getByText('done')).toBeInTheDocument());
  });

  it('aborts in-flight requests on unmount', async () => {
    const user = userEvent.setup();
    const abort = vi.spyOn(AbortController.prototype, 'abort');
    const { unmount } = render(<FileUploader chunkSize={4} chunkDelayMs={200} />);
    await user.upload(fileInput(), textFile('slow.txt', 40));
    expect(within(row('slow.txt')).getByText('uploading')).toBeInTheDocument();
    unmount();
    expect(abort).toHaveBeenCalled();
  });
});
