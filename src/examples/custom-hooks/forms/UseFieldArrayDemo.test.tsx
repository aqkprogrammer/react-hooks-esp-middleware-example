import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseFieldArrayDemo from './UseFieldArrayDemo';

const rows = () => within(screen.getByRole('list')).getAllByRole('listitem');
const noteIn = (row: HTMLElement) => within(row).getByLabelText('Note (uncontrolled)');

describe('UseFieldArrayDemo', () => {
  it('keeps each row’s uncontrolled state when a row above is removed, and moves focus', async () => {
    const user = userEvent.setup();
    render(<UseFieldArrayDemo />);
    expect(rows()).toHaveLength(2);
    await user.type(noteIn(rows()[1] as HTMLElement), 'office');

    await user.click(screen.getByRole('button', { name: 'Remove phone 1' }));
    expect(rows()).toHaveLength(1);
    expect(noteIn(rows()[0] as HTMLElement)).toHaveValue('office');
    expect(within(rows()[0] as HTMLElement).getByLabelText('Number')).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Phone 1 removed.');
  });

  it('shows the bug with index keys', async () => {
    const user = userEvent.setup();
    render(<UseFieldArrayDemo />);
    await user.click(screen.getByLabelText(/Use the array index as/));
    await user.type(noteIn(rows()[0] as HTMLElement), 'personal');
    await user.click(screen.getByRole('button', { name: 'Remove phone 1' }));
    // The note typed for the removed row now appears on the other phone.
    expect(noteIn(rows()[0] as HTMLElement)).toHaveValue('personal');
  });

  it('adds, reorders, validates and reports values', async () => {
    const user = userEvent.setup();
    render(<UseFieldArrayDemo />);
    await user.click(screen.getByRole('button', { name: 'Add phone' }));
    expect(rows()).toHaveLength(3);
    expect(screen.getByRole('status')).toHaveTextContent('Phone 3 added.');

    const third = within(rows()[2] as HTMLElement).getByLabelText('Number');
    await user.type(third, '123');
    await user.tab();
    expect(third).toHaveAccessibleDescription('Enter at least 7 digits.');

    await user.click(screen.getByRole('button', { name: 'Move phone 1 down' }));
    expect(within(rows()[1] as HTMLElement).getByLabelText('Number')).toHaveValue(
      '+44 7700 900123',
    );
    expect(screen.getByRole('button', { name: 'Move phone 2 down' })).toHaveFocus();

    await user.selectOptions(within(rows()[0] as HTMLElement).getByLabelText('Type'), 'home');
    expect(screen.getByText(/"kind":"home"/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset list' }));
    expect(rows()).toHaveLength(2);
  });

  it('focuses "Add phone" after removing the last row', async () => {
    const user = userEvent.setup();
    render(<UseFieldArrayDemo />);
    await user.click(screen.getByRole('button', { name: 'Remove phone 2' }));
    await user.click(screen.getByRole('button', { name: 'Remove phone 1' }));
    expect(screen.getByText('No phone numbers yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add phone' })).toHaveFocus();
  });
});
