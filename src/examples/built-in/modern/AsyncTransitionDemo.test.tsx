import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import AsyncTransitionDemo from './AsyncTransitionDemo';
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

const savedRow = () => within(screen.getByText('Saved name').closest('div') as HTMLElement);

describe('AsyncTransitionDemo', () => {
  it('keeps isPending true for the whole async action, then shows the result', async () => {
    const gate = holdSave();
    render(<AsyncTransitionDemo />);
    leaveActEnvironment();
    typeNatively(screen.getByLabelText<HTMLInputElement>('Display name'), 'Grace');
    screen.getByRole('button', { name: 'Save' }).click();

    expect(await screen.findByText('Action pending')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(savedRow().getByText('Ada')).toBeInTheDocument();

    gate.open();
    expect(await screen.findByText('Idle')).toBeInTheDocument();
    expect(savedRow().getByText('Grace')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows a caught error and leaves the saved name unchanged', async () => {
    const gate = holdSave(500);
    render(<AsyncTransitionDemo />);
    leaveActEnvironment();
    typeNatively(screen.getByLabelText<HTMLInputElement>('Display name'), 'error!');
    screen.getByRole('button', { name: 'Save' }).click();
    expect(await screen.findByText('Action pending')).toBeInTheDocument();
    gate.open();
    expect(await screen.findByText('The server could not save that name')).toBeInTheDocument();
    expect(savedRow().getByText('Ada')).toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toHaveAttribute('aria-invalid', 'true');
  });
});
