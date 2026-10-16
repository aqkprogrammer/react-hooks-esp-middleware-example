import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseReducerDemo from './UseReducerDemo';

const taskList = () => within(screen.getByRole('list', { name: 'Tasks' }));

describe('UseReducerDemo', () => {
  it('starts from the lazily initialised seed tasks', () => {
    render(<UseReducerDemo />);
    expect(taskList().getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByText('3 of 3 remaining')).toBeInTheDocument();
  });

  it('dispatches typed actions and logs them', async () => {
    const user = userEvent.setup();
    render(<UseReducerDemo />);

    await user.type(screen.getByLabelText('Task title'), 'Test it{Enter}');
    expect(taskList().getByText('Test it')).toBeInTheDocument();
    expect(screen.getByRole('log', { name: 'Actions' })).toHaveTextContent(
      'dispatch({"type":"added","title":"Test it"})',
    );

    await user.click(screen.getByRole('checkbox', { name: 'Model the state' }));
    expect(screen.getByText('3 of 4 remaining')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'done' }));
    expect(screen.getByRole('button', { name: 'done' })).toHaveAttribute('aria-pressed', 'true');
    expect(taskList().getAllByRole('checkbox')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'all' }));
    await user.click(screen.getByRole('button', { name: 'Delete "Test it"' }));
    expect(taskList().queryByText('Test it')).not.toBeInTheDocument();
  });

  it('clears completed tasks and undoes the change', async () => {
    const user = userEvent.setup();
    render(<UseReducerDemo />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'List the actions' }));
    await user.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(taskList().queryByText('List the actions')).not.toBeInTheDocument();

    await user.click(undo);
    expect(taskList().getByRole('checkbox', { name: 'List the actions' })).toBeChecked();
    expect(undo).toBeDisabled();
  });
});
