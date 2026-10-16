import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseMemoDemo from './UseMemoDemo';

const effectRuns = () => screen.getByText(/Effect runs/).querySelector('strong')?.textContent;

describe('UseMemoDemo', () => {
  it('filters the ranked rows', async () => {
    const user = userEvent.setup();
    render(<UseMemoDemo />);
    expect(screen.getByText('5000 matching rows · parent re-render #0')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Filter'), 'grace');
    expect(screen.getByText(/^250 matching rows/)).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Top ranked rows' });
    for (const item of within(list).getAllByRole('listitem')) {
      expect(item).toHaveTextContent(/Grace/);
    }
  });

  it('measures one calculation with performance.now in an event handler', async () => {
    const user = userEvent.setup();
    render(<UseMemoDemo />);
    expect(screen.getByText('not measured yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Benchmark one calculation' }));
    expect(screen.getByText(/^\d+\.\d ms$/)).toBeInTheDocument();
  });

  it('re-renders the calculating component on unrelated state either way', async () => {
    const user = userEvent.setup();
    render(<UseMemoDemo />);
    await user.click(screen.getByRole('button', { name: /Unrelated re-render/ }));
    expect(screen.getByText(/parent re-render #1/)).toBeInTheDocument();
    expect(screen.getByText(/RankedRows commits:/)).toHaveTextContent(/commits: 2 /);
    await user.click(screen.getByLabelText(/Skip useMemo/));
    expect(screen.getByText('off — runs every render')).toBeInTheDocument();
  });

  it('keeps the effect from re-running only while the options object is memoised', async () => {
    const user = userEvent.setup();
    render(<UseMemoDemo />);
    expect(effectRuns()).toBe('1');
    await user.type(screen.getByLabelText('Draft message (unrelated state)'), 'abc');
    expect(effectRuns()).toBe('1');

    await user.click(screen.getByLabelText('Memoise the options object with useMemo'));
    expect(effectRuns()).toBe('2');
    await user.type(screen.getByLabelText('Draft message (unrelated state)'), 'abc');
    expect(effectRuns()).toBe('5');
  });

  it('re-runs the memoised effect when a real dependency changes', async () => {
    const user = userEvent.setup();
    render(<UseMemoDemo />);
    await user.selectOptions(screen.getByLabelText('Room'), 'random');
    expect(effectRuns()).toBe('2');
  });
});
