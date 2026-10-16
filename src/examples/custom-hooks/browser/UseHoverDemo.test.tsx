import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseHoverDemo from './UseHoverDemo';

const details = /first published algorithm/;

describe('UseHoverDemo', () => {
  it('shows details on hover and logs pointer events', () => {
    render(<UseHoverDemo />);
    const card = screen.getByTestId('hover-card');
    expect(screen.getByText(details)).not.toBeVisible();
    fireEvent.pointerEnter(card, { pointerType: 'mouse' });
    expect(screen.getByText(details)).toBeVisible();
    expect(screen.getByText('pointerenter (mouse)', { exact: false })).toBeInTheDocument();
    fireEvent.pointerLeave(card, { pointerType: 'mouse' });
    expect(screen.getByText(details)).not.toBeVisible();
  });

  it('offers the same details by keyboard focus and click', async () => {
    const user = userEvent.setup();
    render(<UseHoverDemo />);
    const name = screen.getByRole('button', { name: 'Ada Lovelace' });
    await user.tab();
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute('aria-expanded', 'true');
    await user.click(name);
    await user.tab();
    expect(name).toHaveAttribute('aria-expanded', 'true'); // pinned
  });

  it('can include touch hover', async () => {
    const user = userEvent.setup();
    render(<UseHoverDemo />);
    const card = screen.getByTestId('hover-card');
    fireEvent.pointerEnter(card, { pointerType: 'touch' });
    expect(screen.getByText(details)).not.toBeVisible();
    await user.click(screen.getByLabelText(/Ignore touch/));
    fireEvent.pointerEnter(card, { pointerType: 'touch' });
    expect(screen.getByText(details)).toBeVisible();
  });
});
