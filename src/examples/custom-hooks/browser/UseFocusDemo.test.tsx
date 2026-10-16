import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseFocusDemo from './UseFocusDemo';

describe('UseFocusDemo', () => {
  it('shows the search hint only while the input is focused', async () => {
    const user = userEvent.setup();
    render(<UseFocusDemo />);
    expect(screen.queryByText(/type at least two characters/)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Search docs'));
    expect(screen.getByText(/type at least two characters/)).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByText(/type at least two characters/)).not.toBeInTheDocument();
  });

  it('validates the address group only when focus leaves the whole group', async () => {
    const user = userEvent.setup();
    render(<UseFocusDemo />);
    await user.click(screen.getByLabelText('Street'));
    expect(screen.getByText('focus within')).toBeInTheDocument();
    await user.tab(); // → City, still inside
    expect(screen.getByLabelText('City')).toHaveFocus();
    expect(screen.queryByText('Please complete both address fields.')).not.toBeInTheDocument();

    await user.tab(); // → Next step button, outside
    expect(screen.getByText('Please complete both address fields.')).toBeInTheDocument();
    expect(screen.getByText(/Focus left the group → <button>/)).toBeInTheDocument();
  });
});
