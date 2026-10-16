import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseStateColocationDemo from './UseStateColocationDemo';

describe('UseStateColocationDemo', () => {
  it('filters cities in both panels', async () => {
    const user = userEvent.setup();
    render(<UseStateColocationDemo />);
    await user.type(screen.getByLabelText('Colocated filter'), 'li');
    expect(screen.getByText('Berlin, Lisbon')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Lifted filter'), 'zzz');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('re-renders the sibling only when the state is lifted too high', async () => {
    const user = userEvent.setup();
    render(<UseStateColocationDemo />);
    await user.type(screen.getByLabelText('Lifted filter'), 'abc');
    await user.type(screen.getByLabelText('Colocated filter'), 'abc');

    expect(screen.getByText(/Lifted sibling commits:/)).toHaveTextContent(
      /Lifted sibling commits: 4 /,
    );
    expect(screen.getByText(/Colocated sibling commits:/)).toHaveTextContent(
      /Colocated sibling commits: 1 /,
    );
  });
});
