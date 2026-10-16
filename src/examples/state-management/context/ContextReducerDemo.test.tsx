import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ContextReducerDemo from './ContextReducerDemo';
import { useTodos, useTodosDispatch } from './todosContext';

const commits = (label: string) =>
  Number(screen.getByText(`${label} commits:`).querySelector('span')?.textContent?.split(' ')[0]);

describe('ContextReducerDemo', () => {
  it('adds, toggles and clears todos', async () => {
    const user = userEvent.setup();
    render(<ContextReducerDemo />);
    await user.type(screen.getByLabelText('New todo'), 'Write tests{Enter}');
    expect(screen.getByLabelText('Write tests')).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('1 of 3 done');
    await user.click(screen.getByLabelText('Write tests'));
    expect(screen.getByRole('status')).toHaveTextContent('2 of 3 done');
    await user.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(screen.getByRole('status')).toHaveTextContent('0 of 1 done');
    await user.click(
      screen.getByRole('button', { name: 'Delete Check which components re-render' }),
    );
    expect(screen.getByText('Nothing to do.')).toBeInTheDocument();
  });

  it('does not re-render dispatch-only consumers when the state changes', async () => {
    const user = userEvent.setup();
    render(<ContextReducerDemo />);
    const formBefore = commits('AddTodo');
    const listBefore = commits('TodoList');
    await user.click(screen.getByLabelText('Check which components re-render'));
    await user.click(screen.getByLabelText('Check which components re-render'));
    expect(commits('TodoList')).toBe(listBefore + 2);
    expect(commits('AddTodo')).toBe(formBefore);
  });

  it('throws a helpful error outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTodos())).toThrow(/inside <TodosProvider>/);
    expect(() => renderHook(() => useTodosDispatch())).toThrow(/inside <TodosProvider>/);
  });
});
