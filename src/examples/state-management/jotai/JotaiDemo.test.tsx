import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import JotaiDemo from './JotaiDemo';

const users = () => within(screen.getByRole('list', { name: 'Users' }));

describe('JotaiDemo', () => {
  it('loads users and filters them with derived atoms', async () => {
    const user = userEvent.setup();
    render(<JotaiDemo />);
    expect(screen.getByText('Loading users…')).toBeInTheDocument();
    await screen.findByRole('list', { name: 'Users' });
    expect(users().getByText('Ada Lovelace')).toBeInTheDocument();
    expect(users().getAllByRole('listitem')).toHaveLength(5);

    await user.selectOptions(screen.getByLabelText('Role'), 'editor');
    expect(users().getAllByRole('listitem')).toHaveLength(2);
    await user.type(screen.getByLabelText('Search'), 'grace');
    expect(users().getAllByRole('listitem')).toHaveLength(1);
    await user.type(screen.getByLabelText('Search'), 'zzz');
    expect(users().getByText('No users match.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(users().getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByLabelText('Search')).toHaveValue('');
  });

  it('suspends while the selected profile loads', async () => {
    const user = userEvent.setup();
    render(<JotaiDemo />);
    expect(screen.getByText('Select a user to load their profile.')).toBeInTheDocument();
    const view = await screen.findByRole('button', { name: 'View Grace Hopper' });
    // React 19: an interaction that suspends must run inside an awaited act().
    await act(async () => {
      await user.click(view);
    });
    expect(screen.getByText('Loading profile…')).toBeInTheDocument();
    expect(await screen.findByText('grace@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Grace Hopper' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows request failures', async () => {
    server.use(http.get('/api/users', () => HttpResponse.json({}, { status: 500 })));
    render(<JotaiDemo />);
    expect(await screen.findByText('Request failed (500)')).toBeInTheDocument();
  });
});
