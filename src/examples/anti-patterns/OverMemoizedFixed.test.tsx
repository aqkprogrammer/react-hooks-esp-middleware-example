import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import OverMemoizedFixed from './OverMemoizedFixed';

describe('OverMemoizedFixed', () => {
  it('counts with the selected step without any memoisation', async () => {
    const user = userEvent.setup();
    render(<OverMemoizedFixed />);
    await user.click(screen.getByRole('button', { name: '+1' }));
    expect(screen.getByText('Count: 1 (doubled: 2)')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Step'), '5');
    await user.click(screen.getByRole('button', { name: '+5' }));
    expect(screen.getByText('Count: 6 (doubled: 12)')).toBeInTheDocument();
  });
});
