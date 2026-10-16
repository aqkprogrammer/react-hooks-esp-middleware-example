import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import UseTransitionDemo from './UseTransitionDemo';

const sections = () => within(screen.getByRole('group', { name: 'Sections' }));

describe('UseTransitionDemo', () => {
  it('shows a pending indicator while the slow tab renders in the background', async () => {
    render(<UseTransitionDemo />);
    const postsTab = sections().getByRole('button', { name: 'Posts (slow)' });

    // act() would flush the urgent commit *and* the transition in one go.
    // Leaving the act environment lets React schedule work like a browser,
    // so the intermediate isPending=true commit is observable.
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', false);
    postsTab.click();
    expect(await screen.findByText('Rendering in the background…')).toBeInTheDocument();
    // The previous panel stays on screen (dimmed) while the posts render.
    expect(screen.getByText(/Welcome!/)).toBeInTheDocument();

    // Query a small subtree with queryBy*: a failing getBy* on the whole page
    // pretty-prints thousands of rows on every retry and starves the render.
    const panel = screen.getByRole('region', { name: 'Tabs with a slow panel' });
    await waitFor(() => expect(within(panel).queryByText('Post #200')).not.toBeNull(), {
      timeout: 3000,
    });
    expect(screen.queryByText('Rendering in the background…')).not.toBeInTheDocument();
    expect(postsTab).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches tabs synchronously when transitions are turned off', async () => {
    const user = userEvent.setup();
    render(<UseTransitionDemo />);
    await user.selectOptions(screen.getByLabelText('Render cost per post'), '0');
    await user.click(screen.getByLabelText('Switch tabs inside startTransition'));
    await user.click(sections().getByRole('button', { name: 'Posts (slow)' }));
    expect(screen.getByRole('list', { name: 'Posts' }).children).toHaveLength(200);
    await user.click(sections().getByRole('button', { name: 'Contact' }));
    expect(screen.getByText(/Contact us/)).toBeInTheDocument();
  });

  it('filters the large list behind a transition', async () => {
    const user = userEvent.setup();
    render(<UseTransitionDemo />);
    expect(screen.getByText('2000 people match')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Filter people'), 'hedy');
    expect(screen.getByLabelText('Filter people')).toHaveValue('hedy');
    expect(await screen.findByText('100 people match')).toBeInTheDocument();
    expect(screen.getByText('Up to date')).toBeInTheDocument();
  });
});
