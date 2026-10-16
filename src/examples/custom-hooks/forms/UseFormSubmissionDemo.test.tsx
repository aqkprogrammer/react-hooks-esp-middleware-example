import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { handlers as formHandlers } from '../../../mocks/extra/forms';
import { server } from '../../../test/server';
import UseFormSubmissionDemo from './UseFormSubmissionDemo';

beforeEach(() => server.use(...formHandlers));

const fastFeedback = () =>
  server.use(
    http.post('/api/forms/feedback', async ({ request }) => {
      const body = (await request.json()) as { message: string };
      await delay(30);
      return body.message.includes('fail')
        ? HttpResponse.json({ message: 'Could not save your feedback' }, { status: 500 })
        : HttpResponse.json({ id: 7 }, { status: 201 });
    }),
  );

const log = () => within(screen.getByRole('log', { name: 'Network log' }));

describe('UseFormSubmissionDemo', () => {
  it('goes through submitting → success and shows the result', async () => {
    fastFeedback();
    const user = userEvent.setup();
    render(<UseFormSubmissionDemo />);
    await user.type(screen.getByLabelText('Message'), 'Great demo');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeInTheDocument();
    expect(await screen.findByText('Thanks! Your feedback was saved.')).toBeInTheDocument();
    expect(log().getByText(/saved as #7/)).toBeInTheDocument();
  });

  it('shows server errors', async () => {
    fastFeedback();
    const user = userEvent.setup();
    render(<UseFormSubmissionDemo />);
    await user.type(screen.getByLabelText('Message'), 'please fail');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Could not save your feedback')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('error');
  });

  it('sends only one request for a double submit', async () => {
    fastFeedback();
    const user = userEvent.setup();
    render(<UseFormSubmissionDemo />);
    await user.click(screen.getByRole('button', { name: 'Send twice (double click)' }));
    expect(await screen.findByText('Thanks! Your feedback was saved.')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // submit() calls
    expect(log().getAllByText(/POST \/api\/forms\/feedback/)).toHaveLength(1);
  });

  it('cancels, and aborts the request when the form unmounts', async () => {
    const user = userEvent.setup();
    render(<UseFormSubmissionDemo />);
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(log().getByText('request aborted')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('idle');

    await user.click(screen.getByRole('button', { name: 'Send' }));
    await user.click(screen.getByRole('button', { name: 'Unmount the form' }));
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
    expect(log().getAllByText('request aborted')).toHaveLength(2);
  });
});
