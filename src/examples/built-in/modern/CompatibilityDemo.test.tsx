import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import CompatibilityDemo from './CompatibilityDemo';
import { compatibility, compatibilityGroups } from './compatibilityData';

const rowFor = (tableName: string, api: string) =>
  within(screen.getByRole('table', { name: tableName }))
    .getByRole('rowheader', { name: new RegExp(`^${api.replace(/[<>()]/g, '\\$&')}`) })
    .closest('tr') as HTMLElement;

describe('CompatibilityDemo', () => {
  it('renders one table per group with a row for every API', () => {
    render(<CompatibilityDemo />);
    for (const group of compatibilityGroups) {
      const table = screen.getByRole('table', { name: group.title });
      const expected = compatibility.filter((row) => row.group === group.id).length;
      expect(within(table).getAllByRole('row')).toHaveLength(expected + 1);
    }
  });

  it('shows versions, status and the live export check', () => {
    render(<CompatibilityDemo />);
    const useOptimistic = within(rowFor('React 19 additions', 'useOptimistic'));
    expect(useOptimistic.getByText('19.0')).toBeInTheDocument();
    expect(useOptimistic.getByText('exported')).toBeInTheDocument();

    const activity = within(rowFor('React 19.2 additions', '<Activity>'));
    expect(activity.getByText('19.2')).toBeInTheDocument();

    const render_ = within(rowFor('Legacy & historical', 'ReactDOM.render'));
    expect(render_.getByText('removed')).toBeInTheDocument();
    expect(render_.getByText('not exported')).toBeInTheDocument();
  });

  it('filters by text and by status', async () => {
    const user = userEvent.setup();
    render(<CompatibilityDemo />);
    await user.type(screen.getByLabelText('Search APIs'), 'transition');
    expect(screen.getByRole('table', { name: 'React 19.3 additions' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Legacy & historical' })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search APIs'));
    await user.selectOptions(screen.getByLabelText('Status'), 'removed');
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.getByRole('table', { name: 'Legacy & historical' })).toBeInTheDocument();
  });
});
