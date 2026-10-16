import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import UseFormStatusDemo from './UseFormStatusDemo';
import { createGate, leaveActEnvironment, typeNatively } from './testUtils';

function holdSave(status = 200) {
  const gate = createGate();
  server.use(
    http.put('/api/modern/display-name', async ({ request }) => {
      const { name } = (await request.json()) as { name: string };
      await gate.promise;
      return status === 200
        ? HttpResponse.json({ name })
        : HttpResponse.json({ message: 'The server could not save that name' }, { status });
    }),
  );
  return gate;
}

const readout = () => within(screen.getByLabelText('useFormStatus() inside the form'));

describe('UseFormStatusDemo', () => {
  it('disables the submit button while the parent form is pending', async () => {
    const gate = holdSave();
    render(<UseFormStatusDemo />);
    leaveActEnvironment();
    typeNatively(screen.getByLabelText<HTMLInputElement>('Display name'), 'Grace');
    screen.getByRole('button', { name: 'Save' }).click();

    const pendingButton = await screen.findByRole('button', { name: 'Saving “Grace”…' });
    expect(pendingButton).toBeDisabled();
    expect(readout().getByText('true')).toBeInTheDocument();
    expect(readout().getByText('"get"')).toBeInTheDocument();
    expect(readout().getByText('"Grace"')).toBeInTheDocument();
    // The component that renders the form does not see its status.
    expect(screen.getByText('pending: false')).toBeInTheDocument();

    gate.open();
    expect(await screen.findByText('Saved display name: Grace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect(readout().getByText('false')).toBeInTheDocument();
  });

  it('re-enables the button and shows the error when saving fails', async () => {
    const gate = holdSave(500);
    render(<UseFormStatusDemo />);
    leaveActEnvironment();
    screen.getByRole('button', { name: 'Save' }).click();
    expect(await screen.findByRole('button', { name: 'Saving “Ada”…' })).toBeDisabled();
    gate.open();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server could not save that name',
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
