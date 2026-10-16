import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import FormActionsDemo from './FormActionsDemo';

describe('FormActionsDemo', () => {
  it('passes FormData to the form action and resets the uncontrolled fields', async () => {
    const user = userEvent.setup();
    render(<FormActionsDemo />);
    await user.type(screen.getByLabelText('Comment'), 'Hello actions');
    await user.selectOptions(screen.getByLabelText('Visibility'), 'team');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    const posted = within(screen.getByRole('list', { name: 'Posted comments' }));
    expect(posted.getByText('Hello actions')).toBeInTheDocument();
    expect(posted.getByText('team')).toBeInTheDocument();
    expect(screen.getByLabelText('Comment')).toHaveValue('');
    expect(screen.getByLabelText('Visibility')).toHaveValue('public');
  });

  it('lets a submit button override the action with formAction', async () => {
    const user = userEvent.setup();
    render(<FormActionsDemo />);
    await user.type(screen.getByLabelText('Comment'), 'Not ready yet');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(
      within(screen.getByRole('list', { name: 'Drafts' })).getByText('Not ready yet'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Posted (0)' })).toBeInTheDocument();
  });

  it('reports an empty comment (and the form still resets)', async () => {
    const user = userEvent.setup();
    render(<FormActionsDemo />);
    await user.type(screen.getByLabelText('Comment'), '   ');
    await user.click(screen.getByRole('button', { name: 'Post' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Write something before posting.');
    expect(screen.getByLabelText('Comment')).toHaveValue('');
  });
});
