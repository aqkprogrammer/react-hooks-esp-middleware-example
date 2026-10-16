import { useId, useState } from 'react';
import { Badge, Button, EventLog, Panel, ValueTable, useEventLog } from '../../../components/ui';
import { useFormSubmission, useInput } from '../../../hooks';
import { postJson } from './formsApi';

type Log = ReturnType<typeof useEventLog>['log'];

/**
 * The submit lifecycle on its own: status, errors, a double-submit guard,
 * cancellation, and aborting the request when the form unmounts.
 */
export default function UseFormSubmissionDemo() {
  const [mounted, setMounted] = useState(true);
  const { entries, log, clear } = useEventLog();
  return (
    <div className="stack">
      <div className="row">
        <Button onClick={() => setMounted((value) => !value)}>
          {mounted ? 'Unmount the form' : 'Mount the form'}
        </Button>
        <span className="muted small">Unmount while sending to abort the request.</span>
      </div>
      {mounted ? <FeedbackForm log={log} /> : null}
      <EventLog entries={entries} onClear={clear} title="Network log" />
    </div>
  );
}

function FeedbackForm({ log }: { log: Log }) {
  const message = useInput('');
  const messageId = useId();
  const [attempts, setAttempts] = useState(0);
  const submission = useFormSubmission(
    async (text: string, signal: AbortSignal) => {
      log(`POST /api/forms/feedback "${text}"`);
      signal.addEventListener('abort', () => log('request aborted', 'warn'));
      return postJson<{ id: number }>('/api/forms/feedback', { message: text }, signal);
    },
    {
      onSuccess: (data) => log(`saved as #${data.id}`, 'success'),
      onError: (error) => log(`failed: ${error.message}`, 'error'),
    },
  );

  const send = () => {
    setAttempts((count) => count + 1);
    void submission.submit(message.value);
  };

  return (
    <Panel
      title="Send feedback"
      description='The server takes ~1.2 s. Include the word "fail" to get a 500.'
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className="field">
          <label htmlFor={messageId} className="field-label">
            Message
          </label>
          <textarea id={messageId} rows={3} {...message.bind} />
        </div>
        <div className="row">
          <Button
            type="submit"
            variant="primary"
            aria-disabled={submission.isSubmitting || undefined}
          >
            {submission.isSubmitting ? 'Sending…' : 'Send'}
          </Button>
          <Button
            onClick={() => {
              // Two submits in the same event: only one request is sent.
              send();
              send();
            }}
          >
            Send twice (double click)
          </Button>
          <Button variant="ghost" disabled={!submission.isSubmitting} onClick={submission.abort}>
            Cancel
          </Button>
          <Button variant="ghost" onClick={submission.reset}>
            Reset
          </Button>
        </div>
      </form>
      <div role="status" className="row">
        <Badge
          tone={
            submission.status === 'success'
              ? 'success'
              : submission.status === 'error'
                ? 'warn'
                : 'info'
          }
        >
          {submission.status}
        </Badge>
        {submission.status === 'success' ? <span>Thanks! Your feedback was saved.</span> : null}
        {submission.error ? <span className="field-error">{submission.error.message}</span> : null}
      </div>
      <ValueTable
        label="Submission state"
        rows={{
          'submit() calls': attempts,
          isSubmitting: String(submission.isSubmitting),
          data: submission.data ? `#${submission.data.id}` : '—',
        }}
      />
    </Panel>
  );
}
