import { render, screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import UseActionStateDemo from './UseActionStateDemo';
import { createGate, leaveActEnvironment, typeNatively } from './testUtils';

describe('UseActionStateDemo', () => {
  it('shows the pending state, then the success result', async () => {
    const gate = createGate();
    server.use(
      http.post('/api/modern/newsletter', async ({ request }) => {
        const { email } = (await request.json()) as { email: string };
        await gate.promise;
        return HttpResponse.json({ email, message: `Subscribed ${email}` }, { status: 201 });
      }),
    );
    render(<UseActionStateDemo />);
    leaveActEnvironment();

    typeNatively(screen.getByLabelText<HTMLInputElement>('E-mail'), 'ada@example.com');
    screen.getByRole('button', { name: 'Subscribe' }).click();

    expect(await screen.findByRole('button', { name: 'Subscribing…' })).toBeDisabled();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    gate.open();

    expect(await screen.findByText('Subscribed ada@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeEnabled();
    expect(screen.getByText('Submissions so far: 1')).toBeInTheDocument();
    // The form was reset after the successful action.
    expect(screen.getByLabelText('E-mail')).toHaveValue('');
  });

  it('returns server errors as state and keeps the rejected address', async () => {
    server.use(
      http.post('/api/modern/newsletter', async () => {
        await delay(20);
        return HttpResponse.json(
          { message: 'taken@example.com is already subscribed' },
          { status: 409 },
        );
      }),
    );
    render(<UseActionStateDemo />);
    leaveActEnvironment();

    typeNatively(screen.getByLabelText<HTMLInputElement>('E-mail'), 'taken@example.com');
    screen.getByRole('button', { name: 'Subscribe' }).click();

    expect(await screen.findByText('taken@example.com is already subscribed')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('taken@example.com');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('passes the previous state to the next submission', async () => {
    render(<UseActionStateDemo />);
    leaveActEnvironment();
    server.use(
      http.post('/api/modern/newsletter', () =>
        HttpResponse.json({ message: 'Enter a valid e-mail address' }, { status: 422 }),
      ),
    );
    screen.getByRole('button', { name: 'Subscribe' }).click();
    expect(await screen.findByText('Submissions so far: 1')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Subscribe' }).click();
    expect(await screen.findByText('Submissions so far: 2')).toBeInTheDocument();
  });
});
