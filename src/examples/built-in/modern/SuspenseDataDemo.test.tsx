import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../../test/server';
import SuspenseDataDemo from './SuspenseDataDemo';
import { createGate, leaveActEnvironment } from './testUtils';

const titles: Record<string, string> = { weather: 'Weather', stats: 'Stats', news: 'News' };

/** Widgets respond immediately unless held by `gate`; `?fail=1` → 500. */
function mockWidgets(gate?: { promise: Promise<void> }) {
  server.use(
    http.get('/api/modern/widgets/:name', async ({ params, request }) => {
      await gate?.promise;
      const name = String(params.name);
      if (new URL(request.url).searchParams.get('fail') === '1') {
        return HttpResponse.json({ message: `${titles[name]} service is down` }, { status: 500 });
      }
      return HttpResponse.json({ title: titles[name], lines: [`${name} line`] });
    }),
  );
}

const widget = (name: string) => within(screen.getByRole('region', { name: `${name} widget` }));

describe('SuspenseDataDemo', () => {
  it('shows a fallback per widget, then the data', async () => {
    const gate = createGate();
    mockWidgets(gate);
    render(<SuspenseDataDemo />);
    leaveActEnvironment();
    screen.getByRole('button', { name: 'Load dashboard' }).click();

    expect(await screen.findByText('Loading weather…')).toBeInTheDocument();
    expect(screen.getByText('Loading stats…')).toBeInTheDocument();
    gate.open();
    expect(await screen.findByText('weather line')).toBeInTheDocument();
    expect(await screen.findByText('news line')).toBeInTheDocument();
    expect(widget('stats').getByText('Stats')).toBeInTheDocument();
  });

  it('can reveal all widgets together behind one boundary', async () => {
    const gate = createGate();
    mockWidgets(gate);
    const user = userEvent.setup();
    render(<SuspenseDataDemo />);
    await user.click(screen.getByLabelText(/One Suspense boundary/));
    leaveActEnvironment();
    screen.getByRole('button', { name: 'Load dashboard' }).click();
    expect(await screen.findByText('Loading dashboard…')).toBeInTheDocument();
    expect(screen.queryByText('Loading weather…')).not.toBeInTheDocument();
    gate.open();
    expect(await screen.findByText('news line')).toBeInTheDocument();
  });

  it('contains a failing widget in its own error boundary and retries it', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockWidgets();
    const user = userEvent.setup();
    render(<SuspenseDataDemo />);
    await user.click(screen.getByLabelText(/Make the stats service fail/));
    leaveActEnvironment();
    screen.getByRole('button', { name: 'Load dashboard' }).click();

    expect(await screen.findByRole('alert')).toHaveTextContent('Stats service is down');
    expect(await screen.findByText('weather line')).toBeInTheDocument();
    expect(screen.getByText('news line')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry stats' }).click();
    expect(await screen.findByText('stats line')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });
});
