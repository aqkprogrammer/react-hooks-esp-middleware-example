import { Badge, Callout, Panel } from '../../../components/ui';
import { FileUploader } from './FileUploader';
import './FileUploadScenario.css';

/**
 * Chunked, cancellable, retryable uploads with a concurrency limit. The
 * endpoint is mocked (MSW) — see src/mocks/extra/scenariosAdvanced.ts.
 */
export default function FileUploadScenario() {
  return (
    <div className="stack">
      <Callout tone="warn" title="Mocked upload">
        Files are sent to a mock endpoint (Mock Service Worker) running inside this page — nothing
        leaves your browser. Include <code>fail</code> in a file name to make its second chunk fail
        once, then use <strong>Retry</strong> to resume from that chunk.
      </Callout>
      <Panel
        title={'Upload files'}
        description={
          <span>
            Each file is split into chunks sent one after another with{' '}
            <code>POST /api/uploads/:id/chunks?index=N</code>; several files upload in parallel up
            to the limit. <Badge tone="info">mock API</Badge>
          </span>
        }
      >
        <FileUploader />
      </Panel>
    </div>
  );
}
