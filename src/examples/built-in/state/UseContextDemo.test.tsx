import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseContextDemo from './UseContextDemo';

const card = (name: string) => within(screen.getByRole('region', { name }));

describe('UseContextDemo', () => {
  it('provides theme and user to consumers, with defaults outside providers', () => {
    render(<UseContextDemo />);
    expect(card('Outer card').getByText('Signed in as Ada (editor)')).toBeInTheDocument();
    expect(card('Outer card').getByText('Hello, Ada!')).toBeInTheDocument();
    expect(
      card('Nested provider overrides the tone').getByText('tone: success'),
    ).toBeInTheDocument();
    expect(card('Outer card').getByText('tone: accent')).toBeInTheDocument();
    expect(card('Default value').getByText('Signed out')).toBeInTheDocument();
  });

  it('propagates provider updates to every consumer, including nested overrides', async () => {
    const user = userEvent.setup();
    render(<UseContextDemo />);
    await user.selectOptions(screen.getByLabelText('Density'), 'compact');
    expect(card('Outer card').getByText('density: compact')).toBeInTheDocument();
    expect(
      card('Nested provider overrides the tone').getByText('density: compact'),
    ).toBeInTheDocument();
    expect(card('Default value').getByText('density: comfortable')).toBeInTheDocument();

    const name = screen.getByLabelText('User name');
    await user.clear(name);
    await user.type(name, 'Grace');
    expect(card('Outer card').getByText('Hello, Grace!')).toBeInTheDocument();
  });

  it('handles the signed-out (null) value and conditional use()', async () => {
    const user = userEvent.setup();
    render(<UseContextDemo />);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(card('Outer card').getByText('Signed out')).toBeInTheDocument();
    expect(card('Outer card').getByText('Hello, guest!')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Show greeting/ }));
    expect(card('Outer card').queryByText('Hello, guest!')).not.toBeInTheDocument();
  });
});
